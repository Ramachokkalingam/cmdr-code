#ifndef CMDR_UPDATER_H
#define CMDR_UPDATER_H

#include <stdbool.h>
#include <stdint.h>
#include <time.h>

#ifdef __cplusplus
extern "C" {
#endif

// Constants
#define UPDATER_VERSION_MAX_LEN 32
#define UPDATER_URL_MAX_LEN 512
#define UPDATER_PATH_MAX_LEN 512
#define UPDATER_MESSAGE_MAX_LEN 256
#define UPDATER_CHECKSUM_MAX_LEN 65
#define UPDATER_CHANGELOG_MAX_LEN 2048

// Update status codes
typedef enum {
    UPDATER_STATUS_NO_UPDATE = 0,
    UPDATER_STATUS_UPDATE_AVAILABLE = 1,
    UPDATER_STATUS_CHECKING = 2,
    UPDATER_STATUS_DOWNLOADING = 3,
    UPDATER_STATUS_INSTALLING = 4,
    UPDATER_STATUS_COMPLETE = 5,
    UPDATER_STATUS_ERROR = 6,
    UPDATER_STATUS_ROLLBACK_REQUIRED = 7
} updater_status_t;

// Update channels
typedef enum {
    UPDATER_CHANNEL_STABLE = 0,
    UPDATER_CHANNEL_BETA = 1,
    UPDATER_CHANNEL_NIGHTLY = 2
} updater_channel_t;

// Update information structure
typedef struct {
    char version[UPDATER_VERSION_MAX_LEN];
    char download_url[UPDATER_URL_MAX_LEN];
    char delta_url[UPDATER_URL_MAX_LEN];
    char checksum[UPDATER_CHECKSUM_MAX_LEN];
    char changelog[UPDATER_CHANGELOG_MAX_LEN];
    bool is_critical;
    size_t download_size;
    int rollout_percentage;
    time_t release_date;
} updater_info_t;

// Progress callback function type
typedef void (*updater_progress_cb)(size_t current, size_t total, void *user_data);

// Completion callback function type
typedef void (*updater_completion_cb)(bool success, const char *message, void *user_data);

// Updater context structure
typedef struct {
    char current_version[UPDATER_VERSION_MAX_LEN];
    char platform[32];
    char api_base_url[UPDATER_URL_MAX_LEN];
    char current_executable_path[UPDATER_PATH_MAX_LEN];
    char backup_directory[UPDATER_PATH_MAX_LEN];
    updater_channel_t channel;
    updater_status_t status;
    bool auto_check_enabled;
    int check_interval_hours;
    time_t last_check_time;
    
    // Callbacks
    updater_progress_cb progress_callback;
    updater_completion_cb completion_callback;
    void *user_data;
    
    // Current update info
    updater_info_t current_update;
    
    // Thread safety
    bool check_in_progress;
    bool install_in_progress;
} updater_ctx_t;

// HTTP response structure
typedef struct {
    char *data;
    size_t size;
    size_t capacity;
} http_response_t;

// Function declarations

// Initialization and cleanup
updater_ctx_t* updater_create(const char *current_version, const char *platform);
void updater_destroy(updater_ctx_t *ctx);

// Configuration
bool updater_set_api_url(updater_ctx_t *ctx, const char *url);
bool updater_set_channel(updater_ctx_t *ctx, updater_channel_t channel);
bool updater_set_auto_check(updater_ctx_t *ctx, bool enabled, int interval_hours);
bool updater_set_callbacks(updater_ctx_t *ctx, updater_progress_cb progress_cb, 
                          updater_completion_cb completion_cb, void *user_data);

// Update operations
bool updater_check_for_updates(updater_ctx_t *ctx, updater_info_t *update_info);
bool updater_download_update(updater_ctx_t *ctx, const updater_info_t *update_info, 
                            const char *output_path);
bool updater_install_update(updater_ctx_t *ctx, const char *update_file_path);
bool updater_apply_delta_update(updater_ctx_t *ctx, const char *delta_file, 
                               const char *target_version);

// Safety and rollback
bool updater_create_backup(updater_ctx_t *ctx);
bool updater_rollback_to_backup(updater_ctx_t *ctx);
bool updater_verify_installation(updater_ctx_t *ctx);

// Utility functions
const char* updater_get_platform(void);
const char* updater_get_executable_path(void);
const char* updater_status_to_string(updater_status_t status);
const char* updater_channel_to_string(updater_channel_t channel);
bool updater_verify_checksum(const char *file_path, const char *expected_checksum);
char* updater_calculate_checksum(const char *file_path);

// HTTP utilities
http_response_t* http_response_create(void);
void http_response_destroy(http_response_t *response);
bool http_get(const char *url, http_response_t *response);
bool http_download(const char *url, const char *output_path, 
                  updater_progress_cb progress_cb, void *user_data);

// JSON parsing utilities (simple implementation)
bool json_get_string(const char *json, const char *key, char *value, size_t value_size);
bool json_get_bool(const char *json, const char *key, bool *value);
bool json_get_int(const char *json, const char *key, int *value);
bool json_get_size_t(const char *json, const char *key, size_t *value);

// Error handling
typedef enum {
    UPDATER_ERROR_NONE = 0,
    UPDATER_ERROR_MEMORY,
    UPDATER_ERROR_NETWORK,
    UPDATER_ERROR_IO,
    UPDATER_ERROR_INVALID_VERSION,
    UPDATER_ERROR_CHECKSUM_MISMATCH,
    UPDATER_ERROR_PERMISSION_DENIED,
    UPDATER_ERROR_DISK_SPACE,
    UPDATER_ERROR_CORRUPTED_FILE,
    UPDATER_ERROR_UNSUPPORTED_PLATFORM
} updater_error_t;

const char* updater_error_string(updater_error_t error);
updater_error_t updater_get_last_error(void);
void updater_set_last_error(updater_error_t error);

#ifdef __cplusplus
}
#endif

#endif // CMDR_UPDATER_H
