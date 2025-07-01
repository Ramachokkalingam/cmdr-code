#include "session_persistence.h"
#include "server.h"
#include "utils.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <errno.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <dirent.h>
#include <fcntl.h>
#include <stdarg.h>
#include <libwebsockets.h>

// Global error state
static session_error_t g_last_error = SESSION_ERROR_NONE;

// Logging function with different levels
void session_log(log_level_t level, const char *session_id, const char *format, ...) {
    const char *level_str[] = {"DEBUG", "INFO", "WARN", "ERROR"};
    char timestamp[64];
    time_t now = time(NULL);
    struct tm *tm_info = localtime(&now);
    
    strftime(timestamp, sizeof(timestamp), "%Y-%m-%d %H:%M:%S", tm_info);
    
    va_list args;
    va_start(args, format);
    
    fprintf(stderr, "[%s] [%s] [Session:%s] ", timestamp, level_str[level], 
            session_id ? session_id : "GLOBAL");
    vfprintf(stderr, format, args);
    fprintf(stderr, "\n");
    fflush(stderr);
    
    va_end(args);
}

// Error handling functions
const char* session_error_string(session_error_t error) {
    switch (error) {
        case SESSION_ERROR_NONE: return "No error";
        case SESSION_ERROR_MEMORY: return "Memory allocation failed";
        case SESSION_ERROR_IO: return "I/O operation failed";
        case SESSION_ERROR_INVALID_ID: return "Invalid session ID";
        case SESSION_ERROR_NOT_FOUND: return "Session not found";
        case SESSION_ERROR_ALREADY_EXISTS: return "Session already exists";
        case SESSION_ERROR_PERMISSION_DENIED: return "Permission denied";
        case SESSION_ERROR_DISK_FULL: return "Disk full";
        case SESSION_ERROR_CORRUPTED_STATE: return "Corrupted session state";
        default: return "Unknown error";
    }
}

session_error_t session_get_last_error(void) {
    return g_last_error;
}

void session_set_last_error(session_error_t error) {
    g_last_error = error;
}

// Utility function to safely duplicate strings with error checking
static char* safe_strdup(const char *str) {
    if (!str) return NULL;
    char *dup = strdup(str);
    if (!dup) {
        session_set_last_error(SESSION_ERROR_MEMORY);
        session_log(LOG_ERROR, NULL, "Failed to duplicate string: %s", strerror(errno));
    }
    return dup;
}

// Generate a UUID-based session ID using random data
char* persistent_session_generate_id(void) {
    char *id = malloc(SESSION_ID_LENGTH + 1);
    if (!id) {
        session_set_last_error(SESSION_ERROR_MEMORY);
        session_log(LOG_ERROR, NULL, "Failed to allocate memory for session ID");
        return NULL;
    }
    
    // Generate random data for UUID-like format
    // Format: XXXXXXXX-XXXX-4XXX-YXXX-XXXXXXXXXXXX
    // where X is random hex digit, Y is 8,9,A,B
    
    // Read random data from /dev/urandom
    int fd = open("/dev/urandom", O_RDONLY);
    unsigned char random_bytes[16];
    
    if (fd < 0 || read(fd, random_bytes, 16) != 16) {
        // Fallback to time-based generation
        session_log(LOG_WARN, NULL, "Failed to read from /dev/urandom, using fallback");
        time_t now = time(NULL);
        static int counter = 0;
        snprintf(id, SESSION_ID_LENGTH + 1, 
                "session-%08x-%04x-%04x-%04x-%08x%04x",
                (unsigned int)now,
                (unsigned int)(now >> 16) & 0xFFFF,
                0x4000 | ((counter++) & 0x0FFF),  // Version 4 UUID
                0x8000 | (getpid() & 0x3FFF),     // Variant bits
                (unsigned int)now,
                (unsigned int)getpid() & 0xFFFF);
    } else {
        // Use random bytes to create proper UUID
        snprintf(id, SESSION_ID_LENGTH + 1,
                "%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x",
                random_bytes[0], random_bytes[1], random_bytes[2], random_bytes[3],
                random_bytes[4], random_bytes[5],
                (random_bytes[6] & 0x0F) | 0x40,  // Version 4
                random_bytes[7],
                (random_bytes[8] & 0x3F) | 0x80,  // Variant bits
                random_bytes[9],
                random_bytes[10], random_bytes[11], random_bytes[12], 
                random_bytes[13], random_bytes[14], random_bytes[15]);
    }
    
    if (fd >= 0) close(fd);
    
    session_log(LOG_DEBUG, id, "Generated new session ID");
    return id;
}

// Validate session ID format - accept both UUID and legacy formats
bool persistent_session_validate_id(const char *id) {
    if (!id) {
        session_log(LOG_WARN, id, "NULL session ID");
        return false;
    }
    
    size_t len = strlen(id);
    
    // Check if it's empty or too long
    if (len == 0 || len > 64) {
        session_log(LOG_WARN, id, "Invalid session ID length: %zu", len);
        return false;
    }
    
    // Accept UUID format (36 chars with hyphens at specific positions)
    if (len == SESSION_ID_LENGTH) {
        for (int i = 0; i < SESSION_ID_LENGTH; i++) {
            char c = id[i];
            if (i == 8 || i == 13 || i == 18 || i == 23) {
                if (c != '-') {
                    // Not a UUID, but might be a valid legacy format
                    break;
                }
            } else if (!((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F'))) {
                // Not a UUID, but might be a valid legacy format
                break;
            }
            // If we reach here for the last character, it's a valid UUID
            if (i == SESSION_ID_LENGTH - 1) {
                session_log(LOG_DEBUG, id, "Valid UUID format session ID");
                return true;
            }
        }
    }
    
    // Accept legacy format: session_<timestamp>_<counter> or similar alphanumeric with underscores
    bool valid_legacy = true;
    for (size_t i = 0; i < len; i++) {
        char c = id[i];
        if (!((c >= '0' && c <= '9') || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '_' || c == '-')) {
            valid_legacy = false;
            break;
        }
    }
    
    if (valid_legacy) {
        session_log(LOG_DEBUG, id, "Valid legacy format session ID");
        return true;
    }
    
    session_log(LOG_WARN, id, "Invalid session ID format");
    return false;
}

// Create terminal buffer with specified capacity
terminal_buffer_t* terminal_buffer_create(size_t capacity, size_t max_lines) {
    terminal_buffer_t *buffer = malloc(sizeof(terminal_buffer_t));
    if (!buffer) {
        session_set_last_error(SESSION_ERROR_MEMORY);
        session_log(LOG_ERROR, NULL, "Failed to allocate terminal buffer structure");
        return NULL;
    }
    
    // Initialize buffer structure
    memset(buffer, 0, sizeof(terminal_buffer_t));
    
    // Allocate data buffer
    buffer->data = malloc(capacity);
    if (!buffer->data) {
        session_set_last_error(SESSION_ERROR_MEMORY);
        session_log(LOG_ERROR, NULL, "Failed to allocate terminal buffer data (%zu bytes)", capacity);
        free(buffer);
        return NULL;
    }
    
    // Allocate line pointer array
    buffer->lines = malloc(sizeof(char*) * max_lines);
    if (!buffer->lines) {
        session_set_last_error(SESSION_ERROR_MEMORY);
        session_log(LOG_ERROR, NULL, "Failed to allocate line pointer array (%zu lines)", max_lines);
        free(buffer->data);
        free(buffer);
        return NULL;
    }
    
    buffer->capacity = capacity;
    buffer->max_lines = max_lines;
    buffer->size = 0;
    buffer->head = 0;
    buffer->is_full = false;
    buffer->line_count = 0;
    
    session_log(LOG_DEBUG, NULL, "Created terminal buffer: capacity=%zu, max_lines=%zu", 
                capacity, max_lines);
    
    return buffer;
}

// Destroy terminal buffer and free all memory
void terminal_buffer_destroy(terminal_buffer_t *buffer) {
    if (!buffer) return;
    
    session_log(LOG_DEBUG, NULL, "Destroying terminal buffer: size=%zu, lines=%zu", 
                buffer->size, buffer->line_count);
    
    if (buffer->data) {
        free(buffer->data);
        buffer->data = NULL;
    }
    
    if (buffer->lines) {
        free(buffer->lines);
        buffer->lines = NULL;
    }
    
    free(buffer);
}

// Append data to terminal buffer (circular buffer implementation)
bool terminal_buffer_append(terminal_buffer_t *buffer, const char *data, size_t length) {
    if (!buffer || !data || length == 0) {
        session_log(LOG_WARN, NULL, "Invalid parameters for terminal_buffer_append");
        return false;
    }
    
    // If data is larger than entire buffer, just keep the last part
    if (length >= buffer->capacity) {
        memcpy(buffer->data, data + (length - buffer->capacity), buffer->capacity);
        buffer->size = buffer->capacity;
        buffer->head = 0;
        buffer->is_full = true;
        session_log(LOG_DEBUG, NULL, "Buffer overflow: truncated %zu bytes to %zu", 
                    length, buffer->capacity);
        return true;
    }
    
    // Check if we need to wrap around
    if (buffer->head + length > buffer->capacity) {
        // Copy what fits at the end
        size_t first_chunk = buffer->capacity - buffer->head;
        memcpy(buffer->data + buffer->head, data, first_chunk);
        
        // Copy the rest at the beginning
        memcpy(buffer->data, data + first_chunk, length - first_chunk);
        buffer->head = length - first_chunk;
        buffer->is_full = true;
        buffer->size = buffer->capacity;
    } else {
        // Simple append
        memcpy(buffer->data + buffer->head, data, length);
        buffer->head += length;
        if (!buffer->is_full) {
            buffer->size = buffer->head;
        }
    }
    
    session_log(LOG_DEBUG, NULL, "Appended %zu bytes to terminal buffer (total: %zu/%zu)", 
                length, buffer->size, buffer->capacity);
    
    return true;
}

// Get complete buffer contents as a linear string
char* terminal_buffer_get_contents(terminal_buffer_t *buffer, size_t *length) {
    if (!buffer || !length) {
        session_log(LOG_WARN, NULL, "Invalid parameters for terminal_buffer_get_contents");
        return NULL;
    }
    
    *length = buffer->size;
    if (buffer->size == 0) {
        return safe_strdup("");
    }
    
    char *contents = malloc(buffer->size + 1);
    if (!contents) {
        session_set_last_error(SESSION_ERROR_MEMORY);
        session_log(LOG_ERROR, NULL, "Failed to allocate memory for buffer contents");
        return NULL;
    }
    
    if (buffer->is_full && buffer->head > 0) {
        // Buffer has wrapped around - copy from head to end, then from start to head
        size_t first_chunk = buffer->capacity - buffer->head;
        memcpy(contents, buffer->data + buffer->head, first_chunk);
        memcpy(contents + first_chunk, buffer->data, buffer->head);
    } else {
        // Linear buffer
        memcpy(contents, buffer->data, buffer->size);
    }
    
    contents[buffer->size] = '\0';
    
    session_log(LOG_DEBUG, NULL, "Retrieved %zu bytes from terminal buffer", buffer->size);
    return contents;
}

// Create session registry
session_registry_t* session_registry_create(const char *state_dir) {
    session_registry_t *registry = malloc(sizeof(session_registry_t));
    if (!registry) {
        session_set_last_error(SESSION_ERROR_MEMORY);
        session_log(LOG_ERROR, NULL, "Failed to allocate session registry");
        return NULL;
    }
    
    memset(registry, 0, sizeof(session_registry_t));
    
    // Set state directory
    if (state_dir) {
        strncpy(registry->state_directory, state_dir, MAX_PATH_LENGTH - 1);
        registry->state_directory[MAX_PATH_LENGTH - 1] = '\0';
    } else {
        strncpy(registry->state_directory, SESSION_STATE_DIR, MAX_PATH_LENGTH - 1);
    }
    
    // Create state directory if it doesn't exist
    if (mkdir(registry->state_directory, 0755) != 0 && errno != EEXIST) {
        session_log(LOG_ERROR, NULL, "Failed to create state directory %s: %s", 
                    registry->state_directory, strerror(errno));
        free(registry);
        session_set_last_error(SESSION_ERROR_IO);
        return NULL;
    }
    
    // Set default parameters
    registry->max_inactive_age = 7 * 24 * 3600; // 7 days
    registry->max_sessions = 100;
    registry->last_cleanup = time(NULL);
    
    session_log(LOG_INFO, NULL, "Created session registry with state directory: %s", 
                registry->state_directory);
    
    return registry;
}

// Destroy session registry and all sessions
void session_registry_destroy(session_registry_t *registry) {
    if (!registry) return;
    
    session_log(LOG_INFO, NULL, "Destroying session registry (total sessions: %zu)", 
                registry->total_count);
    
    // Destroy all sessions
    persistent_session_t *current = registry->sessions;
    while (current) {
        persistent_session_t *next = current->next;
        
        session_log(LOG_DEBUG, current->id, "Destroying session during registry cleanup");
        
        // Save session state before destroying
        if (current->needs_save) {
            persistent_session_save_to_disk(current);
        }
        
        // Free session memory
        if (current->id) free(current->id);
        if (current->name) free(current->name);
        if (current->working_directory) free(current->working_directory);
        if (current->command) free(current->command);
        if (current->environment) {
            session_free_environment(current->environment, current->env_count);
        }
        if (current->buffer) {
            terminal_buffer_destroy(current->buffer);
        }
        
        free(current);
        current = next;
    }
    
    // Print final statistics
    session_log(LOG_INFO, NULL, "Registry stats - Created: %zu, Destroyed: %zu, Saves: %zu, Loads: %zu",
                registry->total_sessions_created, registry->total_sessions_destroyed,
                registry->total_save_operations, registry->total_load_operations);
    
    free(registry);
}

// Create a new persistent session
persistent_session_t* persistent_session_create_new(session_registry_t *registry, 
                                                   const char *name, 
                                                   const char *command,
                                                   const char *working_dir) {
    if (!registry) {
        session_log(LOG_ERROR, NULL, "Invalid registry for session creation");
        session_set_last_error(SESSION_ERROR_INVALID_ID);
        return NULL;
    }
    
    persistent_session_t *session = malloc(sizeof(persistent_session_t));
    if (!session) {
        session_set_last_error(SESSION_ERROR_MEMORY);
        session_log(LOG_ERROR, NULL, "Failed to allocate memory for new session");
        return NULL;
    }
    
    memset(session, 0, sizeof(persistent_session_t));
    
    // Generate unique session ID
    char *id = persistent_session_generate_id();
    if (!id) {
        free(session);
        return NULL;
    }
    session->id = id;  // Store the generated ID directly
    
    // Set session properties
    session->name = safe_strdup(name ? name : "Unnamed Session");
    session->command = safe_strdup(command ? command : "/bin/bash");
    session->working_directory = safe_strdup(working_dir ? working_dir : getenv("HOME"));
    
    if (!session->name || !session->command || !session->working_directory) {
        session_log(LOG_ERROR, session->id, "Failed to allocate memory for session properties");
        // Cleanup partially allocated session
        if (session->id) free(session->id);
        if (session->name) free(session->name);
        if (session->command) free(session->command);
        if (session->working_directory) free(session->working_directory);
        free(session);
        return NULL;
    }
    
    // Initialize timestamps
    time_t now = time(NULL);
    session->created_at = now;
    session->last_accessed = now;
    session->last_saved = 0;
    
    // Initialize terminal settings
    session->terminal_cols = 80;
    session->terminal_rows = 24;
    
    // Create terminal buffer
    session->buffer = terminal_buffer_create(MAX_BUFFER_SIZE, 1000);
    if (!session->buffer) {
        session_log(LOG_ERROR, session->id, "Failed to create terminal buffer");
        free(session->id);
        free(session->name);
        free(session->command);
        free(session->working_directory);
        free(session);
        return NULL;
    }
    
    session->is_active = false;
    session->needs_save = true;
    session->process_pid = 0;
    
    // Add to registry
    session->next = registry->sessions;
    registry->sessions = session;
    registry->total_count++;
    registry->total_sessions_created++;
    
    session_log(LOG_INFO, session->id, "Created new session: name='%s', command='%s', cwd='%s'",
                session->name, session->command, session->working_directory);
    
    return session;
}

// Find session by ID
persistent_session_t* persistent_session_find_by_id(session_registry_t *registry, const char *id) {
    if (!registry || !id || !persistent_session_validate_id(id)) {
        session_log(LOG_WARN, id, "Invalid parameters for session lookup");
        return NULL;
    }
    
    persistent_session_t *current = registry->sessions;
    while (current) {
        if (strcmp(current->id, id) == 0) {
            session_log(LOG_DEBUG, id, "Found session: name='%s', active=%s", 
                        current->name, current->is_active ? "true" : "false");
            return current;
        }
        current = current->next;
    }
    
    session_log(LOG_DEBUG, id, "Session not found in registry");
    return NULL;
}

// Attach connection to session
bool persistent_session_attach_connection(persistent_session_t *session, void *pss, void *wsi) {
    if (!session || !pss || !wsi) {
        session_log(LOG_WARN, session ? session->id : NULL, "Invalid parameters for connection attach");
        return false;
    }
    
    // Detach any existing connection
    if (session->current_pss || session->current_wsi) {
        session_log(LOG_INFO, session->id, "Replacing existing connection");
        persistent_session_detach_connection(session);
    }
    
    session->current_pss = pss;
    session->current_wsi = wsi;
    session->is_active = true;
    session->last_accessed = time(NULL);
    session->needs_save = true;
    
    session_log(LOG_INFO, session->id, "Attached connection: pss=%p, wsi=%p", pss, wsi);
    
    return true;
}

// Detach connection from session
bool persistent_session_detach_connection(persistent_session_t *session) {
    if (!session) {
        session_log(LOG_WARN, NULL, "Invalid session for connection detach");
        return false;
    }
    
    session_log(LOG_INFO, session->id, "Detaching connection: pss=%p, wsi=%p", 
                session->current_pss, session->current_wsi);
    
    session->current_pss = NULL;
    session->current_wsi = NULL;
    session->is_active = false;
    session->last_accessed = time(NULL);
    session->needs_save = true;
    
    return true;
}

// Get file path for session state
char* persistent_session_get_state_file_path(const char *session_id, const char *state_dir) {
    if (!session_id || !state_dir) {
        session_log(LOG_WARN, session_id, "Invalid parameters for state file path");
        return NULL;
    }
    
    char *path = malloc(MAX_PATH_LENGTH);
    if (!path) {
        session_set_last_error(SESSION_ERROR_MEMORY);
        session_log(LOG_ERROR, session_id, "Failed to allocate memory for state file path");
        return NULL;
    }
    
    snprintf(path, MAX_PATH_LENGTH, "%s/%s.state", state_dir, session_id);
    return path;
}

// Check if session needs saving
bool persistent_session_needs_saving(persistent_session_t *session) {
    if (!session) return false;
    
    // Save if marked dirty or if it's been a while since last save
    time_t now = time(NULL);
    bool needs_periodic_save = (now - session->last_saved) > PERSISTENCE_SAVE_INTERVAL;
    
    return session->needs_save || needs_periodic_save;
}

// Mark session as needing save
void persistent_session_mark_dirty(persistent_session_t *session) {
    if (session) {
        session->needs_save = true;
        session_log(LOG_DEBUG, session->id, "Session marked for saving");
    }
}

// Save session to disk
bool persistent_session_save_to_disk(persistent_session_t *session) {
    if (!session) {
        session_log(LOG_WARN, NULL, "Invalid session for disk save");
        return false;
    }
    
    char *state_file = persistent_session_get_state_file_path(session->id, SESSION_STATE_DIR);
    if (!state_file) {
        return false;
    }
    
    FILE *fp = fopen(state_file, "w");
    if (!fp) {
        session_log(LOG_ERROR, session->id, "Failed to open state file for writing: %s", 
                    strerror(errno));
        free(state_file);
        session_set_last_error(SESSION_ERROR_IO);
        return false;
    }
    
    // Write session metadata
    fprintf(fp, "SESSION_VERSION=1\n");
    fprintf(fp, "ID=%s\n", session->id);
    fprintf(fp, "NAME=%s\n", session->name);
    fprintf(fp, "COMMAND=%s\n", session->command);
    fprintf(fp, "WORKING_DIR=%s\n", session->working_directory);
    fprintf(fp, "CREATED_AT=%ld\n", session->created_at);
    fprintf(fp, "LAST_ACCESSED=%ld\n", session->last_accessed);
    fprintf(fp, "TERMINAL_COLS=%u\n", session->terminal_cols);
    fprintf(fp, "TERMINAL_ROWS=%u\n", session->terminal_rows);
    fprintf(fp, "PROCESS_PID=%d\n", session->process_pid);
    fprintf(fp, "TOTAL_BYTES=%zu\n", session->total_bytes_written);
    fprintf(fp, "SAVE_COUNT=%zu\n", session->save_count + 1);
    
    // Write buffer data if present
    if (session->buffer && session->buffer->size > 0) {
        fprintf(fp, "BUFFER_SIZE=%zu\n", session->buffer->size);
        fprintf(fp, "BUFFER_HEAD=%zu\n", session->buffer->head);
        fprintf(fp, "BUFFER_FULL=%s\n", session->buffer->is_full ? "true" : "false");
        fprintf(fp, "---BUFFER_DATA---\n");
        
        // Write buffer contents
        if (session->buffer->is_full && session->buffer->head > 0) {
            // Handle wrapped buffer
            fwrite(session->buffer->data + session->buffer->head, 1, 
                   session->buffer->capacity - session->buffer->head, fp);
            fwrite(session->buffer->data, 1, session->buffer->head, fp);
        } else {
            // Linear buffer
            fwrite(session->buffer->data, 1, session->buffer->size, fp);
        }
    }
    
    fclose(fp);
    free(state_file);
    
    // Update session state
    session->last_saved = time(NULL);
    session->needs_save = false;
    session->save_count++;
    
    session_log(LOG_INFO, session->id, "Saved session to disk (save #%zu, buffer size: %zu)", 
                session->save_count, session->buffer ? session->buffer->size : 0);
    
    return true;
}

// Load session from disk
persistent_session_t* persistent_session_load_from_disk(const char *session_id, const char *state_dir) {
    if (!session_id || !persistent_session_validate_id(session_id)) {
        session_log(LOG_WARN, session_id, "Invalid session ID for disk load");
        return NULL;
    }
    
    char *state_file = persistent_session_get_state_file_path(session_id, state_dir);
    if (!state_file) {
        return NULL;
    }
    
    FILE *fp = fopen(state_file, "r");
    if (!fp) {
        session_log(LOG_DEBUG, session_id, "State file not found: %s", state_file);
        free(state_file);
        return NULL;
    }
    
    persistent_session_t *session = malloc(sizeof(persistent_session_t));
    if (!session) {
        session_set_last_error(SESSION_ERROR_MEMORY);
        session_log(LOG_ERROR, session_id, "Failed to allocate memory for session");
        fclose(fp);
        free(state_file);
        return NULL;
    }
    
    memset(session, 0, sizeof(persistent_session_t));
    session->id = safe_strdup(session_id);
    
    // Read session metadata
    char line[1024];
    size_t buffer_size = 0;
    size_t buffer_head = 0;
    bool buffer_full = false;
    bool reading_buffer = false;
    
    while (fgets(line, sizeof(line), fp)) {
        // Remove newline
        line[strcspn(line, "\r\n")] = 0;
        
        if (strcmp(line, "---BUFFER_DATA---") == 0) {
            reading_buffer = true;
            break;
        }
        
        char *eq = strchr(line, '=');
        if (!eq) continue;
        
        *eq = '\0';
        char *key = line;
        char *value = eq + 1;
        
        if (strcmp(key, "NAME") == 0) {
            session->name = safe_strdup(value);
        } else if (strcmp(key, "COMMAND") == 0) {
            session->command = safe_strdup(value);
        } else if (strcmp(key, "WORKING_DIR") == 0) {
            session->working_directory = safe_strdup(value);
        } else if (strcmp(key, "CREATED_AT") == 0) {
            session->created_at = atol(value);
        } else if (strcmp(key, "LAST_ACCESSED") == 0) {
            session->last_accessed = atol(value);
        } else if (strcmp(key, "TERMINAL_COLS") == 0) {
            session->terminal_cols = atoi(value);
        } else if (strcmp(key, "TERMINAL_ROWS") == 0) {
            session->terminal_rows = atoi(value);
        } else if (strcmp(key, "PROCESS_PID") == 0) {
            session->process_pid = atoi(value);
        } else if (strcmp(key, "TOTAL_BYTES") == 0) {
            session->total_bytes_written = atol(value);
        } else if (strcmp(key, "SAVE_COUNT") == 0) {
            session->save_count = atol(value);
        } else if (strcmp(key, "BUFFER_SIZE") == 0) {
            buffer_size = atol(value);
        } else if (strcmp(key, "BUFFER_HEAD") == 0) {
            buffer_head = atol(value);
        } else if (strcmp(key, "BUFFER_FULL") == 0) {
            buffer_full = (strcmp(value, "true") == 0);
        }
    }
    
    // Create buffer and load data if present
    if (buffer_size > 0) {
        session->buffer = terminal_buffer_create(MAX_BUFFER_SIZE, 1000);
        if (session->buffer && reading_buffer) {
            // Read buffer data
            char *buffer_data = malloc(buffer_size);
            if (buffer_data) {
                size_t bytes_read = fread(buffer_data, 1, buffer_size, fp);
                if (bytes_read == buffer_size) {
                    memcpy(session->buffer->data, buffer_data, buffer_size);
                    session->buffer->size = buffer_size;
                    session->buffer->head = buffer_head;
                    session->buffer->is_full = buffer_full;
                    
                    session_log(LOG_INFO, session_id, "Loaded buffer data: %zu bytes", buffer_size);
                } else {
                    session_log(LOG_WARN, session_id, "Buffer data size mismatch: expected %zu, got %zu", 
                                buffer_size, bytes_read);
                }
                free(buffer_data);
            }
        }
    }
    
    if (!session->buffer) {
        session->buffer = terminal_buffer_create(MAX_BUFFER_SIZE, 1000);
    }
    
    fclose(fp);
    free(state_file);
    
    // Set defaults for missing fields
    if (!session->name) session->name = safe_strdup("Restored Session");
    if (!session->command) session->command = safe_strdup("/bin/bash");
    if (!session->working_directory) session->working_directory = safe_strdup(getenv("HOME"));
    
    session->is_active = false;
    session->needs_save = false;
    session->last_saved = time(NULL);
    
    session_log(LOG_INFO, session_id, "Loaded session from disk: name='%s', buffer=%zu bytes", 
                session->name, session->buffer ? session->buffer->size : 0);
    
    return session;
}

// Load all sessions from disk into registry
bool session_registry_load_from_disk(session_registry_t *registry) {
    if (!registry) {
        session_log(LOG_WARN, NULL, "Invalid registry for disk load");
        return false;
    }
    
    DIR *dir = opendir(registry->state_directory);
    if (!dir) {
        session_log(LOG_WARN, NULL, "Could not open state directory: %s", registry->state_directory);
        return false;
    }
    
    struct dirent *entry;
    size_t loaded_count = 0;
    
    while ((entry = readdir(dir)) != NULL) {
        // Skip non-state files
        char *ext = strrchr(entry->d_name, '.');
        if (!ext || strcmp(ext, ".state") != 0) {
            continue;
        }
        
        // Extract session ID (remove .state extension)
        char session_id[SESSION_ID_LENGTH + 1];
        size_t name_len = ext - entry->d_name;
        if (name_len != SESSION_ID_LENGTH) {
            session_log(LOG_WARN, NULL, "Invalid state file name: %s", entry->d_name);
            continue;
        }
        
        strncpy(session_id, entry->d_name, SESSION_ID_LENGTH);
        session_id[SESSION_ID_LENGTH] = '\0';
        
        // Load session
        persistent_session_t *session = persistent_session_load_from_disk(session_id, registry->state_directory);
        if (session) {
            // Add to registry
            session->next = registry->sessions;
            registry->sessions = session;
            registry->total_count++;
            loaded_count++;
            
            session_log(LOG_DEBUG, session_id, "Added loaded session to registry");
        }
    }
    
    closedir(dir);
    registry->total_load_operations++;
    
    session_log(LOG_INFO, NULL, "Loaded %zu sessions from disk", loaded_count);
    return true;
}

// Save all sessions in registry
bool session_registry_save_all(session_registry_t *registry) {
    if (!registry) return false;
    
    persistent_session_t *current = registry->sessions;
    size_t saved_count = 0;
    
    while (current) {
        if (persistent_session_needs_saving(current)) {
            if (persistent_session_save_to_disk(current)) {
                saved_count++;
            }
        }
        current = current->next;
    }
    
    registry->total_save_operations++;
    
    session_log(LOG_INFO, NULL, "Saved %zu sessions to disk", saved_count);
    return true;
}

// Free environment variables array
void session_free_environment(char **env, size_t count) {
    if (!env) return;
    
    for (size_t i = 0; i < count; i++) {
        if (env[i]) {
            free(env[i]);
        }
    }
    free(env);
}

// Get session info as JSON string
char* persistent_session_get_info_json(persistent_session_t *session) {
    if (!session) return NULL;
    
    // Simple JSON creation (could use a library for more complex cases)
    char *json = malloc(2048);
    if (!json) {
        session_set_last_error(SESSION_ERROR_MEMORY);
        return NULL;
    }
    
    snprintf(json, 2048,
        "{"
        "\"id\":\"%s\","
        "\"name\":\"%s\","
        "\"command\":\"%s\","
        "\"working_directory\":\"%s\","
        "\"created_at\":%ld,"
        "\"last_accessed\":%ld,"
        "\"last_saved\":%ld,"
        "\"is_active\":%s,"
        "\"process_pid\":%d,"
        "\"terminal_cols\":%u,"
        "\"terminal_rows\":%u,"
        "\"buffer_size\":%zu,"
        "\"total_bytes_written\":%zu,"
        "\"save_count\":%zu"
        "}",
        session->id,
        session->name,
        session->command,
        session->working_directory,
        session->created_at,
        session->last_accessed,
        session->last_saved,
        session->is_active ? "true" : "false",
        session->process_pid,
        session->terminal_cols,
        session->terminal_rows,
        session->buffer ? session->buffer->size : 0,
        session->total_bytes_written,
        session->save_count
    );
    
    return json;
}

// Print session registry statistics
void session_registry_print_stats(session_registry_t *registry) {
    if (!registry) return;
    
    session_log(LOG_INFO, NULL, "=== Session Registry Statistics ===");
    session_log(LOG_INFO, NULL, "Total sessions: %zu", registry->total_count);
    session_log(LOG_INFO, NULL, "Active sessions: %zu", registry->active_count);
    session_log(LOG_INFO, NULL, "Sessions created: %zu", registry->total_sessions_created);
    session_log(LOG_INFO, NULL, "Sessions destroyed: %zu", registry->total_sessions_destroyed);
    session_log(LOG_INFO, NULL, "Save operations: %zu", registry->total_save_operations);
    session_log(LOG_INFO, NULL, "Load operations: %zu", registry->total_load_operations);
    session_log(LOG_INFO, NULL, "State directory: %s", registry->state_directory);
    session_log(LOG_INFO, NULL, "=====================================");
}

// Integration functions for existing server code

// Convert persistent_session to session_data (for backward compatibility)
struct session_data* persistent_session_to_session_data(persistent_session_t *persistent) {
    if (!persistent) return NULL;
    
    struct session_data *session = malloc(sizeof(struct session_data));
    if (!session) {
        session_set_last_error(SESSION_ERROR_MEMORY);
        return NULL;
    }
    
    session->id = safe_strdup(persistent->id);
    session->name = safe_strdup(persistent->name);
    session->command = safe_strdup(persistent->command);
    session->working_dir = safe_strdup(persistent->working_directory);
    session->created_at = persistent->created_at;
    session->last_used = persistent->last_accessed;
    session->is_active = persistent->is_active;
    session->is_archived = false;
    session->process_pid = persistent->process_pid;
    session->history = NULL; // This will be handled by terminal buffer
    
    session_log(LOG_DEBUG, persistent->id, "Converted persistent session to session_data");
    return session;
}

// Handle terminal output for persistent sessions
bool persistent_session_handle_pty_output(persistent_session_t *session, const char *data, size_t length) {
    if (!session || !data || length == 0) {
        session_log(LOG_WARN, session ? session->id : NULL, "Invalid parameters for PTY output");
        return false;
    }
    
    // Update session access time
    session->last_accessed = time(NULL);
    session->total_bytes_written += length;
    
    // Store in terminal buffer
    if (session->buffer) {
        if (!terminal_buffer_append(session->buffer, data, length)) {
            session_log(LOG_ERROR, session->id, "Failed to append data to terminal buffer");
            return false;
        }
    }
    
    // Mark session as needing save
    persistent_session_mark_dirty(session);
    
    // Note: We DON'T forward to WebSocket client here - let the original flow handle it
    // This prevents duplicate output
    
    session_log(LOG_DEBUG, session->id, "Stored %zu bytes in persistent session buffer", length);
    
    return true;
}

// Send session's terminal buffer to a newly connected client
bool persistent_session_send_buffer_to_client(persistent_session_t *session) {
    if (!session || !session->current_wsi || !session->buffer) {
        session_log(LOG_WARN, session ? session->id : NULL, "Invalid parameters for buffer send");
        return false;
    }
    
    if (session->buffer->size == 0) {
        session_log(LOG_DEBUG, session->id, "No buffer data to send");
        return true;
    }
    
    size_t length;
    char *contents = terminal_buffer_get_contents(session->buffer, &length);
    if (!contents) {
        session_log(LOG_ERROR, session->id, "Failed to get buffer contents");
        return false;
    }
    
    // Send buffer contents in chunks to avoid WebSocket frame size limits
    const size_t chunk_size = 8192; // 8KB chunks
    size_t sent = 0;
    
    while (sent < length) {
        size_t remaining = length - sent;
        size_t current_chunk = remaining > chunk_size ? chunk_size : remaining;
        
        size_t buf_size = LWS_PRE + current_chunk + 1;
        unsigned char *buf = malloc(buf_size);
        if (!buf) {
            session_log(LOG_ERROR, session->id, "Failed to allocate buffer for chunk");
            free(contents);
            return false;
        }
        
        buf[LWS_PRE] = OUTPUT; // Server message type
        memcpy(&buf[LWS_PRE + 1], contents + sent, current_chunk);
        
        int ret = lws_write((struct lws*)session->current_wsi, &buf[LWS_PRE], 
                          current_chunk + 1, LWS_WRITE_BINARY);
        free(buf);
        
        if (ret < 0) {
            session_log(LOG_ERROR, session->id, "Failed to send buffer chunk to client");
            free(contents);
            return false;
        }
        
        sent += current_chunk;
        
        // Give the WebSocket some time to process the data
        if (sent < length) {
            usleep(1000); // 1ms delay between chunks
        }
    }
    
    free(contents);
    session_log(LOG_INFO, session->id, "Sent %zu bytes of buffer data to client", length);
    return true;
}

// Create or find persistent session for WebSocket connection
persistent_session_t* persistent_session_handle_websocket_connection(session_registry_t *registry, 
                                                                     const char *session_id, 
                                                                     void *pss, void *wsi,
                                                                     const char *working_dir) {
    if (!registry || !session_id || !pss || !wsi) {
        session_log(LOG_ERROR, session_id, "Invalid parameters for WebSocket connection");
        return NULL;
    }
    
    // Validate session ID
    if (!persistent_session_validate_id(session_id)) {
        session_log(LOG_WARN, session_id, "Invalid session ID format for WebSocket connection");
        return NULL;
    }
    
    // Try to find existing session
    persistent_session_t *session = persistent_session_find_by_id(registry, session_id);
    
    if (session) {
        session_log(LOG_INFO, session_id, "Attaching to existing persistent session");
        
        // Attach connection
        if (!persistent_session_attach_connection(session, pss, wsi)) {
            session_log(LOG_ERROR, session_id, "Failed to attach connection to existing session");
            return NULL;
        }
        
        // Send existing buffer to client
        persistent_session_send_buffer_to_client(session);
        
        return session;
    } else {
        session_log(LOG_INFO, session_id, "Creating new persistent session");
        
        // Create new session
        session = persistent_session_create_new(registry, session_id, "/bin/bash", working_dir);
        if (!session) {
            session_log(LOG_ERROR, session_id, "Failed to create new persistent session");
            return NULL;
        }
        
        // Replace the generated ID with the requested one
        free(session->id);
        session->id = safe_strdup(session_id);
        if (!session->id) {
            session_log(LOG_ERROR, session_id, "Failed to set requested session ID");
            return NULL;
        }
        
        // Attach connection
        if (!persistent_session_attach_connection(session, pss, wsi)) {
            session_log(LOG_ERROR, session_id, "Failed to attach connection to new session");
            return NULL;
        }
        
        return session;
    }
}

// Cleanup function for WebSocket disconnection
bool persistent_session_handle_websocket_disconnection(persistent_session_t *session) {
    if (!session) {
        session_log(LOG_WARN, NULL, "Invalid session for WebSocket disconnection");
        return false;
    }
    
    session_log(LOG_INFO, session->id, "Handling WebSocket disconnection");
    
    // Detach connection but keep session alive
    persistent_session_detach_connection(session);
    
    // Save session state
    if (!persistent_session_save_to_disk(session)) {
        session_log(LOG_WARN, session->id, "Failed to save session state on disconnection");
    }
    
    return true;
}

// Destroy session when explicitly requested
bool persistent_session_handle_session_close(session_registry_t *registry, const char *session_id) {
    if (!registry || !session_id) {
        session_log(LOG_WARN, session_id, "Invalid parameters for session close");
        return false;
    }
    
    persistent_session_t *session = persistent_session_find_by_id(registry, session_id);
    if (!session) {
        session_log(LOG_WARN, session_id, "Session not found for close operation");
        return false;
    }
    
    session_log(LOG_INFO, session_id, "Explicitly closing and destroying session");
    
    // Remove from registry and destroy
    return persistent_session_destroy(registry, session_id);
}

// Get list of all sessions as JSON
char* session_registry_get_sessions_json(session_registry_t *registry) {
    if (!registry) return NULL;
    
    // Simple JSON array creation
    size_t json_size = 1024; // Start with 1KB
    char *json = malloc(json_size);
    if (!json) {
        session_set_last_error(SESSION_ERROR_MEMORY);
        return NULL;
    }
    
    strcpy(json, "[");
    size_t json_len = 1;
    
    persistent_session_t *current = registry->sessions;
    bool first = true;
    
    while (current) {
        char *session_json = persistent_session_get_info_json(current);
        if (session_json) {
            size_t session_json_len = strlen(session_json);
            size_t needed = json_len + session_json_len + 10; // Extra space for comma, etc.
            
            if (needed > json_size) {
                json_size = needed * 2;
                char *new_json = realloc(json, json_size);
                if (!new_json) {
                    free(json);
                    free(session_json);
                    session_set_last_error(SESSION_ERROR_MEMORY);
                    return NULL;
                }
                json = new_json;
            }
            
            if (!first) {
                strcat(json, ",");
                json_len++;
            }
            strcat(json, session_json);
            json_len += session_json_len;
            first = false;
            
            free(session_json);
        }
        current = current->next;
    }
    
    strcat(json, "]");
    
    session_log(LOG_DEBUG, NULL, "Generated sessions JSON list (%zu sessions)", registry->total_count);
    return json;
}

// Destroy session and remove from registry
bool persistent_session_destroy(session_registry_t *registry, const char *id) {
    if (!registry || !id) {
        session_log(LOG_WARN, id, "Invalid parameters for session destroy");
        return false;
    }
    
    persistent_session_t *current = registry->sessions;
    persistent_session_t *prev = NULL;
    
    while (current) {
        if (strcmp(current->id, id) == 0) {
            session_log(LOG_INFO, id, "Destroying session");
            
            // Close any active connection
            if (current->current_wsi && current->current_pss) {
                lws_close_reason((struct lws*)current->current_wsi, 
                               LWS_CLOSE_STATUS_NORMAL, (unsigned char*)"session closed", 14);
            }
            
            // Remove state file
            char *state_file = persistent_session_get_state_file_path(id, registry->state_directory);
            if (state_file) {
                if (unlink(state_file) != 0 && errno != ENOENT) {
                    session_log(LOG_WARN, id, "Failed to remove state file: %s", strerror(errno));
                }
                free(state_file);
            }
            
            // Remove from linked list
            if (prev) {
                prev->next = current->next;
            } else {
                registry->sessions = current->next;
            }
            registry->total_count--;
            registry->total_sessions_destroyed++;
            
            // Free memory
            if (current->id) free(current->id);
            if (current->name) free(current->name);
            if (current->working_directory) free(current->working_directory);
            if (current->command) free(current->command);
            if (current->environment) {
                session_free_environment(current->environment, current->env_count);
            }
            if (current->buffer) {
                terminal_buffer_destroy(current->buffer);
            }
            free(current);
            
            session_log(LOG_INFO, id, "Session destroyed successfully");
            return true;
        }
        prev = current;
        current = current->next;
    }
    
    session_log(LOG_WARN, id, "Session not found for destroy operation");
    return false;
}

// Periodic maintenance function to save dirty sessions and cleanup old ones
void session_registry_maintenance(session_registry_t *registry) {
    if (!registry) return;
    
    time_t now = time(NULL);
    size_t saved_count = 0;
    size_t active_count = 0;
    
    // Save dirty sessions and count active ones
    persistent_session_t *current = registry->sessions;
    while (current) {
        if (current->is_active) {
            active_count++;
        }
        
        if (persistent_session_needs_saving(current)) {
            if (persistent_session_save_to_disk(current)) {
                saved_count++;
            }
        }
        current = current->next;
    }
    
    registry->active_count = active_count;
    
    // Cleanup old sessions if needed
    if ((now - registry->last_cleanup) > 3600) { // Cleanup every hour
        session_registry_cleanup_old(registry);
        registry->last_cleanup = now;
    }
    
    if (saved_count > 0) {
        session_log(LOG_DEBUG, NULL, "Maintenance: saved %zu sessions, %zu active", 
                    saved_count, active_count);
    }
}

// Cleanup old inactive sessions
void session_registry_cleanup_old(session_registry_t *registry) {
    if (!registry) return;
    
    time_t now = time(NULL);
    persistent_session_t *current = registry->sessions;
    persistent_session_t *prev = NULL;
    size_t cleaned_count = 0;
    
    session_log(LOG_DEBUG, NULL, "Starting cleanup of old sessions");
    
    while (current) {
        persistent_session_t *next = current->next;
        bool should_remove = false;
        
        // Check if session should be cleaned up
        if (!current->is_active) {
            time_t age = now - current->last_accessed;
            
            // Remove if session is too old
            if (age > registry->max_inactive_age) {
                session_log(LOG_INFO, current->id, "Removing old inactive session (age: %ld seconds)", age);
                should_remove = true;
            }
        }
        
        // Also cleanup if we have too many sessions
        if (!should_remove && registry->total_count > registry->max_sessions) {
            // Find the oldest inactive session to remove
            if (!current->is_active) {
                session_log(LOG_INFO, current->id, "Removing session due to max session limit");
                should_remove = true;
            }
        }
        
        if (should_remove) {
            // Save session state before removing
            if (current->needs_save) {
                persistent_session_save_to_disk(current);
            }
            
            // Remove state file
            char *state_file = persistent_session_get_state_file_path(current->id, registry->state_directory);
            if (state_file) {
                if (unlink(state_file) != 0 && errno != ENOENT) {
                    session_log(LOG_WARN, current->id, "Failed to remove state file: %s", strerror(errno));
                }
                free(state_file);
            }
            
            // Remove from linked list
            if (prev) {
                prev->next = next;
            } else {
                registry->sessions = next;
            }
            registry->total_count--;
            registry->total_sessions_destroyed++;
            cleaned_count++;
            
            // Free memory
            if (current->name) free(current->name);
            if (current->working_directory) free(current->working_directory);
            if (current->command) free(current->command);
            if (current->environment) {
                session_free_environment(current->environment, current->env_count);
            }
            if (current->buffer) {
                terminal_buffer_destroy(current->buffer);
            }
            free(current);
        } else {
            prev = current;
        }
        
        current = next;
    }
    
    if (cleaned_count > 0) {
        session_log(LOG_INFO, NULL, "Cleanup completed: removed %zu old sessions", cleaned_count);
    }
}
