#ifndef CMDR_SESSION_PERSISTENCE_H
#define CMDR_SESSION_PERSISTENCE_H

#include <stdbool.h>
#include <stdint.h>
#include <time.h>
#include <sys/types.h>

// Constants for session persistence
#define SESSION_STATE_DIR "/tmp/cmdr-sessions"
#define SESSION_ID_LENGTH 36
#define MAX_BUFFER_SIZE (1024 * 1024)  // 1MB max terminal buffer
#define MAX_PATH_LENGTH 1024
#define PERSISTENCE_SAVE_INTERVAL 30  // Save every 30 seconds

// Terminal buffer structure for storing output history
typedef struct terminal_buffer {
    char *data;              // Terminal output data
    size_t capacity;         // Total allocated size
    size_t size;             // Current data size
    size_t head;             // Current write position (for circular buffer)
    bool is_full;            // Whether buffer has wrapped around
    char **lines;            // Array of line pointers for quick access
    size_t line_count;       // Number of lines
    size_t max_lines;        // Maximum number of lines to store
} terminal_buffer_t;

// Persistent session state structure
typedef struct persistent_session {
    char *id;                           // Session ID (variable length)
    char *name;                         // User-friendly session name
    char *working_directory;            // Current working directory
    char *command;                      // Initial command
    char **environment;                 // Environment variables
    size_t env_count;                   // Number of environment variables
    
    time_t created_at;                  // Session creation time
    time_t last_accessed;               // Last access time
    time_t last_saved;                  // Last save time
    
    pid_t process_pid;                  // Current process PID (0 if not running)
    uint16_t terminal_cols;             // Terminal columns
    uint16_t terminal_rows;             // Terminal rows
    
    terminal_buffer_t *buffer;          // Terminal output buffer
    
    bool is_active;                     // Whether session has active connection
    bool needs_save;                    // Whether session state needs saving
    
    struct persistent_session *next;   // Linked list next pointer
    
    // Connection management
    void *current_pss;                  // Current WebSocket connection (pss_tty*)
    void *current_wsi;                  // Current WebSocket instance
    
    // Debug and error tracking
    size_t total_bytes_written;         // Total bytes written to buffer
    size_t save_count;                  // Number of times saved
    char last_error[256];               // Last error message
} persistent_session_t;

// Session registry for managing all sessions
typedef struct session_registry {
    persistent_session_t *sessions;     // Linked list of sessions
    size_t active_count;                // Number of active sessions
    size_t total_count;                 // Total number of sessions
    char state_directory[MAX_PATH_LENGTH]; // Directory for state files
    
    // Cleanup parameters
    time_t last_cleanup;                // Last cleanup time
    size_t max_inactive_age;            // Max age for inactive sessions (seconds)
    size_t max_sessions;                // Maximum number of sessions to keep
    
    // Debug and statistics
    size_t total_sessions_created;      // Total sessions ever created
    size_t total_sessions_destroyed;    // Total sessions destroyed
    size_t total_save_operations;       // Total save operations
    size_t total_load_operations;       // Total load operations
} session_registry_t;

// Logging levels for session persistence
typedef enum {
    LOG_DEBUG = 0,
    LOG_INFO = 1,
    LOG_WARN = 2,
    LOG_ERROR = 3
} log_level_t;

// Session persistence API functions

// Registry management
session_registry_t* session_registry_create(const char *state_dir);
void session_registry_destroy(session_registry_t *registry);
bool session_registry_load_from_disk(session_registry_t *registry);
bool session_registry_save_all(session_registry_t *registry);
void session_registry_cleanup_old(session_registry_t *registry);

// Session lifecycle
persistent_session_t* persistent_session_create_new(session_registry_t *registry, 
                                                   const char *name, 
                                                   const char *command,
                                                   const char *working_dir);
persistent_session_t* persistent_session_find_by_id(session_registry_t *registry, const char *id);
bool persistent_session_attach_connection(persistent_session_t *session, void *pss, void *wsi);
bool persistent_session_detach_connection(persistent_session_t *session);
bool persistent_session_destroy(session_registry_t *registry, const char *id);

// Session state persistence
bool persistent_session_save_to_disk(persistent_session_t *session);
persistent_session_t* persistent_session_load_from_disk(const char *session_id, const char *state_dir);
bool persistent_session_needs_saving(persistent_session_t *session);
void persistent_session_mark_dirty(persistent_session_t *session);

// Terminal buffer management
terminal_buffer_t* terminal_buffer_create(size_t capacity, size_t max_lines);
void terminal_buffer_destroy(terminal_buffer_t *buffer);
bool terminal_buffer_append(terminal_buffer_t *buffer, const char *data, size_t length);
char* terminal_buffer_get_contents(terminal_buffer_t *buffer, size_t *length);
char** terminal_buffer_get_lines(terminal_buffer_t *buffer, size_t *line_count);
bool terminal_buffer_save_to_file(terminal_buffer_t *buffer, const char *filepath);
bool terminal_buffer_load_from_file(terminal_buffer_t *buffer, const char *filepath);
void terminal_buffer_clear(terminal_buffer_t *buffer);

// Session information and debugging
char* persistent_session_get_info_json(persistent_session_t *session);
char* session_registry_get_stats_json(session_registry_t *registry);
void persistent_session_print_debug_info(persistent_session_t *session);
void session_registry_print_stats(session_registry_t *registry);

// Utility functions
char* persistent_session_generate_id(void);
bool persistent_session_validate_id(const char *id);
char* persistent_session_get_state_file_path(const char *session_id, const char *state_dir);
bool persistent_session_state_file_exists(const char *session_id, const char *state_dir);
time_t persistent_session_get_file_mtime(const char *filepath);

// Memory management helpers
void session_free_environment(char **env, size_t count);
char** session_copy_environment(char **env, size_t count);
void session_log(log_level_t level, const char *session_id, const char *format, ...);

// Error handling
typedef enum {
    SESSION_ERROR_NONE = 0,
    SESSION_ERROR_MEMORY,
    SESSION_ERROR_IO,
    SESSION_ERROR_INVALID_ID,
    SESSION_ERROR_NOT_FOUND,
    SESSION_ERROR_ALREADY_EXISTS,
    SESSION_ERROR_PERMISSION_DENIED,
    SESSION_ERROR_DISK_FULL,
    SESSION_ERROR_CORRUPTED_STATE
} session_error_t;

const char* session_error_string(session_error_t error);
session_error_t session_get_last_error(void);
void session_set_last_error(session_error_t error);

// Integration functions for existing server code
struct session_data* persistent_session_to_session_data(persistent_session_t *persistent);
bool persistent_session_handle_pty_output(persistent_session_t *session, const char *data, size_t length);
bool persistent_session_send_buffer_to_client(persistent_session_t *session);
persistent_session_t* persistent_session_handle_websocket_connection(session_registry_t *registry, 
                                                                     const char *session_id, 
                                                                     void *pss, void *wsi,
                                                                     const char *working_dir);
bool persistent_session_handle_websocket_disconnection(persistent_session_t *session);
bool persistent_session_handle_session_close(session_registry_t *registry, const char *session_id);
char* session_registry_get_sessions_json(session_registry_t *registry);
void session_registry_maintenance(session_registry_t *registry);

#endif // CMDR_SESSION_PERSISTENCE_H
