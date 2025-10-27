#include "server.h"
#include "updater.h"
#include <json.h>
#include <pthread.h>

// Structure for passing data to update thread
typedef struct {
    struct lws *wsi;
    struct server *srv;
    char action[32];
    char data[512];
} update_thread_data_t;

// Thread function for checking updates
static void* update_check_thread(void* arg) {
    update_thread_data_t *thread_data = (update_thread_data_t*)arg;
    struct server *srv = thread_data->srv;
    struct lws *wsi = thread_data->wsi;
    
    if (!srv->updater) {
        server_send_update_status(wsi, "error", "Updater not initialized", NULL);
        free(thread_data);
        return NULL;
    }
    
    updater_info_t update_info;
    bool has_update = updater_check_for_updates(srv->updater, &update_info);
    
    if (has_update) {
        server_send_update_status(wsi, "update_available", "Update available", update_info.version);
        
        // Send additional update info
        json_object *response = json_object_new_object();
        json_object_object_add(response, "type", json_object_new_string("update_info"));
        json_object_object_add(response, "version", json_object_new_string(update_info.version));
        json_object_object_add(response, "downloadSize", json_object_new_int64(update_info.download_size));
        json_object_object_add(response, "changelog", json_object_new_string(update_info.changelog));
        json_object_object_add(response, "critical", json_object_new_boolean(update_info.is_critical));
        
        const char *json_str = json_object_to_json_string(response);
        size_t json_len = strlen(json_str);
        
        unsigned char *buf = malloc(LWS_PRE + json_len + 1);
        if (buf) {
            buf[LWS_PRE + json_len] = '\0';
            memcpy(&buf[LWS_PRE], json_str, json_len);
            lws_write(wsi, &buf[LWS_PRE], json_len, LWS_WRITE_TEXT);
            free(buf);
        }
        
        json_object_put(response);
    } else {
        server_send_update_status(wsi, "no_update", "No update available", NULL);
    }
    
    free(thread_data);
    return NULL;
}

// Thread function for downloading and installing updates
static void* update_install_thread(void* arg) {
    update_thread_data_t *thread_data = (update_thread_data_t*)arg;
    struct server *srv = thread_data->srv;
    struct lws *wsi = thread_data->wsi;
    
    if (!srv->updater) {
        server_send_update_status(wsi, "error", "Updater not initialized", NULL);
        free(thread_data);
        return NULL;
    }
    
    // Get current update info
    updater_info_t *update_info = &srv->updater->current_update;
    if (strlen(update_info->version) == 0) {
        server_send_update_status(wsi, "error", "No update available to install", NULL);
        free(thread_data);
        return NULL;
    }
    
    // Download update
    char temp_path[512];
    snprintf(temp_path, sizeof(temp_path), "/tmp/cmdr_update_%s", update_info->version);
    
    server_send_update_status(wsi, "downloading", "Downloading update...", update_info->version);
    
    bool download_success = updater_download_update(srv->updater, update_info, temp_path);
    if (!download_success) {
        server_send_update_status(wsi, "error", "Failed to download update", NULL);
        free(thread_data);
        return NULL;
    }
    
    // Install update
    server_send_update_status(wsi, "installing", "Installing update...", update_info->version);
    
    bool install_success = updater_install_update(srv->updater, temp_path);
    if (install_success) {
        server_send_update_status(wsi, "complete", "Update installed successfully", update_info->version);
    } else {
        server_send_update_status(wsi, "error", "Failed to install update", NULL);
    }
    
    free(thread_data);
    return NULL;
}

// Initialize updater system
bool server_init_updater(struct server *srv) {
    if (!srv) return false;
    
    const char *platform = updater_get_platform();
    srv->updater = updater_create(CMDR_VERSION, platform);
    
    if (!srv->updater) {
        lwsl_err("Failed to initialize updater\n");
        return false;
    }
    
    // Configure updater
    updater_set_api_url(srv->updater, "http://localhost:8000");
    updater_set_channel(srv->updater, UPDATER_CHANNEL_STABLE);
    updater_set_auto_check(srv->updater, true, 24);
    
    // Set callbacks
    updater_set_callbacks(srv->updater, update_progress_callback, update_completion_callback, srv);
    
    lwsl_user("Updater initialized for platform: %s\n", platform);
    return true;
}

// Cleanup updater
void server_cleanup_updater(struct server *srv) {
    if (srv && srv->updater) {
        updater_destroy(srv->updater);
        srv->updater = NULL;
    }
}

// Handle update messages from WebSocket
void server_handle_update_message(struct lws *wsi, const char *action, const char *data) {
    extern struct server *server;  // Global server instance
    
    if (!action) return;
    
    lwsl_user("Received update action: %s\n", action);
    
    update_thread_data_t *thread_data = malloc(sizeof(update_thread_data_t));
    if (!thread_data) {
        server_send_update_status(wsi, "error", "Memory allocation failed", NULL);
        return;
    }
    
    thread_data->wsi = wsi;
    thread_data->srv = server;
    strncpy(thread_data->action, action, sizeof(thread_data->action) - 1);
    if (data) {
        strncpy(thread_data->data, data, sizeof(thread_data->data) - 1);
    } else {
        thread_data->data[0] = '\0';
    }
    
    pthread_t thread;
    int ret = 0;
    
    if (strcmp(action, "check") == 0) {
        ret = pthread_create(&thread, NULL, update_check_thread, thread_data);
    } else if (strcmp(action, "install") == 0) {
        ret = pthread_create(&thread, NULL, update_install_thread, thread_data);
    } else if (strcmp(action, "rollback") == 0) {
        if (server->updater && updater_rollback_to_backup(server->updater)) {
            server_send_update_status(wsi, "rollback_complete", "Rollback completed", NULL);
        } else {
            server_send_update_status(wsi, "error", "Rollback failed", NULL);
        }
        free(thread_data);
        return;
    } else {
        server_send_update_status(wsi, "error", "Unknown update action", NULL);
        free(thread_data);
        return;
    }
    
    if (ret != 0) {
        server_send_update_status(wsi, "error", "Failed to start update thread", NULL);
        free(thread_data);
    } else {
        pthread_detach(thread);
    }
}

// Send update status message to client
void server_send_update_status(struct lws *wsi, const char *status, const char *message, const char *version) {
    if (!wsi || !status || !message) return;
    
    json_object *response = json_object_new_object();
    json_object_object_add(response, "type", json_object_new_string("update_status"));
    json_object_object_add(response, "status", json_object_new_string(status));
    json_object_object_add(response, "message", json_object_new_string(message));
    
    if (version) {
        json_object_object_add(response, "version", json_object_new_string(version));
    }
    
    const char *json_str = json_object_to_json_string(response);
    size_t json_len = strlen(json_str);
    
    unsigned char *buf = malloc(LWS_PRE + json_len + 1);
    if (buf) {
        buf[LWS_PRE + json_len] = '\0';
        memcpy(&buf[LWS_PRE], json_str, json_len);
        lws_write(wsi, &buf[LWS_PRE], json_len, LWS_WRITE_TEXT);
        free(buf);
    }
    
    json_object_put(response);
}

// Send update progress message to client
void server_send_update_progress(struct lws *wsi, int progress, const char *message) {
    if (!wsi || !message) return;
    
    json_object *response = json_object_new_object();
    json_object_object_add(response, "type", json_object_new_string("update_progress"));
    json_object_object_add(response, "progress", json_object_new_int(progress));
    json_object_object_add(response, "message", json_object_new_string(message));
    
    const char *json_str = json_object_to_json_string(response);
    size_t json_len = strlen(json_str);
    
    unsigned char *buf = malloc(LWS_PRE + json_len + 1);
    if (buf) {
        buf[LWS_PRE + json_len] = '\0';
        memcpy(&buf[LWS_PRE], json_str, json_len);
        lws_write(wsi, &buf[LWS_PRE], json_len, LWS_WRITE_TEXT);
        free(buf);
    }
    
    json_object_put(response);
}

// Progress callback for updater
void update_progress_callback(size_t current, size_t total, void *user_data) {
    if (!user_data) return;
    
    struct server *srv = (struct server*)user_data;
    
    int progress = 0;
    if (total > 0) {
        progress = (int)((current * 100) / total);
    }
    
    char message[256];
    snprintf(message, sizeof(message), "Downloaded %zu of %zu bytes", current, total);
    
    // Note: We can't send directly from this callback as we don't have wsi here
    // In a real implementation, you'd need to store the wsi in the server context
    // or use a different mechanism to communicate progress
    lwsl_user("Update progress: %d%% - %s\n", progress, message);
}

// Completion callback for updater
void update_completion_callback(bool success, const char *message, void *user_data) {
    if (!user_data) return;
    
    struct server *srv = (struct server*)user_data;
    
    lwsl_user("Update completion: %s - %s\n", success ? "SUCCESS" : "FAILED", message);
    
    // Note: Similar to progress callback, in a real implementation you'd need
    // a way to communicate this back to the WebSocket client
}
