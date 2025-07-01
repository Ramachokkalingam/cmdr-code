#include "server.h"
#include "utils.h"

#include <json.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>

#define MAX_SESSIONS 50
#define SESSION_FILE_PATH ".cmdr_sessions.json"

// Initialize session manager
struct session_manager* session_manager_init() {
    struct session_manager *mgr = xmalloc(sizeof(struct session_manager));
    mgr->sessions = xmalloc(sizeof(struct session_data*) * MAX_SESSIONS);
    mgr->session_count = 0;
    mgr->max_sessions = MAX_SESSIONS;
    mgr->sessions_file = strdup(SESSION_FILE_PATH);
    
    // Load existing sessions from file
    session_manager_load(mgr);
    
    return mgr;
}

// Generate unique session ID
char* generate_session_id() {
    static int counter = 0;
    char *id = xmalloc(32);
    time_t now = time(NULL);
    snprintf(id, 32, "session_%ld_%d", now, ++counter);
    return id;
}

// Create new session
struct session_data* session_create(struct session_manager *mgr, const char *name, const char *command, const char *cwd) {
    if (mgr->session_count >= mgr->max_sessions) {
        // Remove oldest inactive session
        session_cleanup_old(mgr);
    }
    
    struct session_data *session = xmalloc(sizeof(struct session_data));
    session->id = generate_session_id();
    session->name = name ? strdup(name) : strdup("New Session");
    session->command = command ? strdup(command) : strdup("bash");
    session->working_dir = cwd ? strdup(cwd) : strdup(getenv("HOME") ?: "/");
    session->created_at = time(NULL);
    session->last_used = time(NULL);
    session->is_active = true;
    session->is_archived = false;
    session->process_pid = 0;
    session->history = NULL;
    
    mgr->sessions[mgr->session_count++] = session;
    
    // Save to file
    session_manager_save(mgr);
    
    return session;
}

// Find session by ID
struct session_data* session_find_by_id(struct session_manager *mgr, const char *id) {
    for (int i = 0; i < mgr->session_count; i++) {
        if (strcmp(mgr->sessions[i]->id, id) == 0) {
            return mgr->sessions[i];
        }
    }
    return NULL;
}

// Update session last used time
void session_update_last_used(struct session_data *session) {
    session->last_used = time(NULL);
}

// Delete session
bool session_delete(struct session_manager *mgr, const char *id) {
    for (int i = 0; i < mgr->session_count; i++) {
        if (strcmp(mgr->sessions[i]->id, id) == 0) {
            // Free session data
            struct session_data *session = mgr->sessions[i];
            free(session->id);
            free(session->name);
            free(session->command);
            free(session->working_dir);
            if (session->history) free(session->history);
            free(session);
            
            // Shift array
            for (int j = i; j < mgr->session_count - 1; j++) {
                mgr->sessions[j] = mgr->sessions[j + 1];
            }
            mgr->session_count--;
            
            // Save to file
            session_manager_save(mgr);
            return true;
        }
    }
    return false;
}

// Rename session
bool session_rename(struct session_manager *mgr, const char *id, const char *new_name) {
    struct session_data *session = session_find_by_id(mgr, id);
    if (session) {
        free(session->name);
        session->name = strdup(new_name);
        session_manager_save(mgr);
        return true;
    }
    return false;
}

// Get sessions as JSON
char* session_list_to_json(struct session_manager *mgr) {
    json_object *root = json_object_new_array();
    
    for (int i = 0; i < mgr->session_count; i++) {
        struct session_data *session = mgr->sessions[i];
        json_object *obj = json_object_new_object();
        
        json_object_object_add(obj, "id", json_object_new_string(session->id));
        json_object_object_add(obj, "name", json_object_new_string(session->name));
        json_object_object_add(obj, "command", json_object_new_string(session->command));
        json_object_object_add(obj, "working_dir", json_object_new_string(session->working_dir));
        json_object_object_add(obj, "created_at", json_object_new_int64(session->created_at));
        json_object_object_add(obj, "last_used", json_object_new_int64(session->last_used));
        json_object_object_add(obj, "is_active", json_object_new_boolean(session->is_active));
        
        json_object_array_add(root, obj);
    }
    
    const char *json_str = json_object_to_json_string(root);
    char *result = strdup(json_str);
    json_object_put(root);
    
    return result;
}

// Save sessions to file
void session_manager_save(struct session_manager *mgr) {
    char *json_str = session_list_to_json(mgr);
    FILE *fp = fopen(mgr->sessions_file, "w");
    if (fp) {
        fprintf(fp, "%s", json_str);
        fclose(fp);
    }
    free(json_str);
}

// Load sessions from file
void session_manager_load(struct session_manager *mgr) {
    FILE *fp = fopen(mgr->sessions_file, "r");
    if (!fp) return;
    
    fseek(fp, 0, SEEK_END);
    long size = ftell(fp);
    fseek(fp, 0, SEEK_SET);
    
    char *buffer = xmalloc(size + 1);
    fread(buffer, 1, size, fp);
    buffer[size] = '\0';
    fclose(fp);
    
    json_object *root = json_tokener_parse(buffer);
    if (root && json_object_is_type(root, json_type_array)) {
        int len = json_object_array_length(root);
        
        for (int i = 0; i < len && mgr->session_count < mgr->max_sessions; i++) {
            json_object *obj = json_object_array_get_idx(root, i);
            if (obj) {
                struct session_data *session = xmalloc(sizeof(struct session_data));
                
                json_object *id_obj, *name_obj, *cmd_obj, *cwd_obj, *created_obj, *used_obj, *active_obj;
                
                if (json_object_object_get_ex(obj, "id", &id_obj))
                    session->id = strdup(json_object_get_string(id_obj));
                if (json_object_object_get_ex(obj, "name", &name_obj))
                    session->name = strdup(json_object_get_string(name_obj));
                if (json_object_object_get_ex(obj, "command", &cmd_obj))
                    session->command = strdup(json_object_get_string(cmd_obj));
                if (json_object_object_get_ex(obj, "working_dir", &cwd_obj))
                    session->working_dir = strdup(json_object_get_string(cwd_obj));
                if (json_object_object_get_ex(obj, "created_at", &created_obj))
                    session->created_at = json_object_get_int64(created_obj);
                if (json_object_object_get_ex(obj, "last_used", &used_obj))
                    session->last_used = json_object_get_int64(used_obj);
                if (json_object_object_get_ex(obj, "is_active", &active_obj))
                    session->is_active = json_object_get_boolean(active_obj);
                
                session->is_archived = false;
                session->process_pid = 0;
                session->history = NULL;
                
                mgr->sessions[mgr->session_count++] = session;
            }
        }
    }
    
    if (root) json_object_put(root);
    free(buffer);
}

// Cleanup old sessions (keep only last 20)
void session_cleanup_old(struct session_manager *mgr) {
    if (mgr->session_count < mgr->max_sessions) return;
    
    // Find oldest inactive session
    time_t oldest_time = time(NULL);
    int oldest_idx = -1;
    
    for (int i = 0; i < mgr->session_count; i++) {
        if (!mgr->sessions[i]->is_active && mgr->sessions[i]->last_used < oldest_time) {
            oldest_time = mgr->sessions[i]->last_used;
            oldest_idx = i;
        }
    }
    
    if (oldest_idx >= 0) {
        session_delete_by_index(mgr, oldest_idx);
    }
}

// Delete session by index
void session_delete_by_index(struct session_manager *mgr, int index) {
    if (index < 0 || index >= mgr->session_count) return;
    
    struct session_data *session = mgr->sessions[index];
    free(session->id);
    free(session->name);
    free(session->command);
    free(session->working_dir);
    if (session->history) free(session->history);
    free(session);
    
    for (int j = index; j < mgr->session_count - 1; j++) {
        mgr->sessions[j] = mgr->sessions[j + 1];
    }
    mgr->session_count--;
}

// Free session manager
void session_manager_free(struct session_manager *mgr) {
    if (!mgr) return;
    
    for (int i = 0; i < mgr->session_count; i++) {
        struct session_data *session = mgr->sessions[i];
        free(session->id);
        free(session->name);
        free(session->command);
        free(session->working_dir);
        if (session->history) free(session->history);
        free(session);
    }
    
    free(mgr->sessions);
    free(mgr->sessions_file);
    free(mgr);
}
