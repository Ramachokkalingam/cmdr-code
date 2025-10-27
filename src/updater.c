#include "updater.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/stat.h>
#include <errno.h>
#include <curl/curl.h>

#ifdef __linux__
#include <sys/wait.h>
#elif _WIN32
#include <windows.h>
#include <shellapi.h>
#elif __APPLE__
#include <mach-o/dyld.h>
#endif

// Global error state
static updater_error_t last_error = UPDATER_ERROR_NONE;

// HTTP response callback for curl
typedef struct {
    http_response_t *response;
    updater_progress_cb progress_cb;
    void *user_data;
    size_t content_length;
} curl_context_t;

static size_t write_callback(void *contents, size_t size, size_t nmemb, curl_context_t *ctx) {
    size_t realsize = size * nmemb;
    http_response_t *response = ctx->response;
    
    // Expand buffer if needed
    size_t new_size = response->size + realsize + 1;
    if (new_size > response->capacity) {
        size_t new_capacity = response->capacity == 0 ? 4096 : response->capacity * 2;
        while (new_capacity < new_size) {
            new_capacity *= 2;
        }
        
        char *new_data = realloc(response->data, new_capacity);
        if (!new_data) {
            updater_set_last_error(UPDATER_ERROR_MEMORY);
            return 0;
        }
        response->data = new_data;
        response->capacity = new_capacity;
    }
    
    memcpy(response->data + response->size, contents, realsize);
    response->size += realsize;
    response->data[response->size] = '\0';
    
    // Call progress callback if available
    if (ctx->progress_cb && ctx->content_length > 0) {
        ctx->progress_cb(response->size, ctx->content_length, ctx->user_data);
    }
    
    return realsize;
}

static size_t file_write_callback(void *contents, size_t size, size_t nmemb, FILE *file) {
    return fwrite(contents, size, nmemb, file);
}

static int progress_callback(void *clientp, curl_off_t dltotal, curl_off_t dlnow,
                           curl_off_t ultotal, curl_off_t ulnow) {
    curl_context_t *ctx = (curl_context_t *)clientp;
    if (ctx->progress_cb && dltotal > 0) {
        ctx->progress_cb((size_t)dlnow, (size_t)dltotal, ctx->user_data);
    }
    return 0;
}

// Initialization and cleanup
updater_ctx_t* updater_create(const char *current_version, const char *platform) {
    if (!current_version || !platform) {
        updater_set_last_error(UPDATER_ERROR_INVALID_VERSION);
        return NULL;
    }
    
    updater_ctx_t *ctx = calloc(1, sizeof(updater_ctx_t));
    if (!ctx) {
        updater_set_last_error(UPDATER_ERROR_MEMORY);
        return NULL;
    }
    
    strncpy(ctx->current_version, current_version, UPDATER_VERSION_MAX_LEN - 1);
    strncpy(ctx->platform, platform, sizeof(ctx->platform) - 1);
    
    // Set default values
    strcpy(ctx->api_base_url, "http://localhost:8000/api");
    ctx->channel = UPDATER_CHANNEL_STABLE;
    ctx->status = UPDATER_STATUS_NO_UPDATE;
    ctx->auto_check_enabled = true;
    ctx->check_interval_hours = 24;
    ctx->last_check_time = 0;
    
    // Get current executable path
    const char *exe_path = updater_get_executable_path();
    if (exe_path) {
        strncpy(ctx->current_executable_path, exe_path, UPDATER_PATH_MAX_LEN - 1);
    }
    
    // Set backup directory
    snprintf(ctx->backup_directory, UPDATER_PATH_MAX_LEN, "/tmp/cmdr-backup");
    
    // Initialize curl
    curl_global_init(CURL_GLOBAL_DEFAULT);
    
    return ctx;
}

void updater_destroy(updater_ctx_t *ctx) {
    if (!ctx) return;
    
    curl_global_cleanup();
    free(ctx);
}

// Configuration functions
bool updater_set_api_url(updater_ctx_t *ctx, const char *url) {
    if (!ctx || !url) return false;
    
    strncpy(ctx->api_base_url, url, UPDATER_URL_MAX_LEN - 1);
    return true;
}

bool updater_set_channel(updater_ctx_t *ctx, updater_channel_t channel) {
    if (!ctx) return false;
    
    ctx->channel = channel;
    return true;
}

bool updater_set_auto_check(updater_ctx_t *ctx, bool enabled, int interval_hours) {
    if (!ctx) return false;
    
    ctx->auto_check_enabled = enabled;
    ctx->check_interval_hours = interval_hours;
    return true;
}

bool updater_set_callbacks(updater_ctx_t *ctx, updater_progress_cb progress_cb,
                          updater_completion_cb completion_cb, void *user_data) {
    if (!ctx) return false;
    
    ctx->progress_callback = progress_cb;
    ctx->completion_callback = completion_cb;
    ctx->user_data = user_data;
    return true;
}

// HTTP utilities
http_response_t* http_response_create(void) {
    http_response_t *response = calloc(1, sizeof(http_response_t));
    if (!response) {
        updater_set_last_error(UPDATER_ERROR_MEMORY);
        return NULL;
    }
    return response;
}

void http_response_destroy(http_response_t *response) {
    if (!response) return;
    
    free(response->data);
    free(response);
}

bool http_get(const char *url, http_response_t *response) {
    if (!url || !response) return false;
    
    CURL *curl = curl_easy_init();
    if (!curl) {
        updater_set_last_error(UPDATER_ERROR_NETWORK);
        return false;
    }
    
    curl_context_t ctx = {
        .response = response,
        .progress_cb = NULL,
        .user_data = NULL,
        .content_length = 0
    };
    
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &ctx);
    curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 30L);
    
    // Set headers
    struct curl_slist *headers = NULL;
    headers = curl_slist_append(headers, "Content-Type: application/json");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    
    CURLcode res = curl_easy_perform(curl);
    
    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    
    if (res != CURLE_OK) {
        updater_set_last_error(UPDATER_ERROR_NETWORK);
        return false;
    }
    
    return true;
}

bool http_get_with_version_headers(const char *url, http_response_t *response, 
                                   const char *current_version, const char *platform) {
    if (!url || !response || !current_version || !platform) return false;
    
    CURL *curl = curl_easy_init();
    if (!curl) {
        updater_set_last_error(UPDATER_ERROR_NETWORK);
        return false;
    }
    
    curl_context_t ctx = {
        .response = response,
        .progress_cb = NULL,
        .user_data = NULL,
        .content_length = 0
    };
    
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &ctx);
    curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 30L);
    
    // Set headers including version and platform
    struct curl_slist *headers = NULL;
    headers = curl_slist_append(headers, "Content-Type: application/json");
    
    char version_header[256];
    snprintf(version_header, sizeof(version_header), "X-Current-Version: %s", current_version);
    headers = curl_slist_append(headers, version_header);
    
    char platform_header[256]; 
    snprintf(platform_header, sizeof(platform_header), "X-Platform: %s", platform);
    headers = curl_slist_append(headers, platform_header);
    
    char user_agent_header[256];
    snprintf(user_agent_header, sizeof(user_agent_header), "User-Agent: CMDR/%s", current_version);
    headers = curl_slist_append(headers, user_agent_header);
    
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    
    CURLcode res = curl_easy_perform(curl);
    
    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    
    if (res != CURLE_OK) {
        updater_set_last_error(UPDATER_ERROR_NETWORK);
        return false;
    }
    
    return true;
}

bool http_download(const char *url, const char *output_path,
                  updater_progress_cb progress_cb, void *user_data) {
    if (!url || !output_path) return false;
    
    FILE *file = fopen(output_path, "wb");
    if (!file) {
        updater_set_last_error(UPDATER_ERROR_IO);
        return false;
    }
    
    CURL *curl = curl_easy_init();
    if (!curl) {
        fclose(file);
        updater_set_last_error(UPDATER_ERROR_NETWORK);
        return false;
    }
    
    curl_context_t ctx = {
        .response = NULL,
        .progress_cb = progress_cb,
        .user_data = user_data,
        .content_length = 0
    };
    
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, file_write_callback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, file);
    curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 300L);
    
    if (progress_cb) {
        curl_easy_setopt(curl, CURLOPT_NOPROGRESS, 0L);
        curl_easy_setopt(curl, CURLOPT_XFERINFOFUNCTION, progress_callback);
        curl_easy_setopt(curl, CURLOPT_XFERINFODATA, &ctx);
    }
    
    CURLcode res = curl_easy_perform(curl);
    
    curl_easy_cleanup(curl);
    fclose(file);
    
    if (res != CURLE_OK) {
        remove(output_path);
        updater_set_last_error(UPDATER_ERROR_NETWORK);
        return false;
    }
    
    return true;
}

// Simple JSON parsing utilities
bool json_get_string(const char *json, const char *key, char *value, size_t value_size) {
    if (!json || !key || !value) return false;
    
    char search_key[256];
    snprintf(search_key, sizeof(search_key), "\"%s\":", key);
    
    const char *key_pos = strstr(json, search_key);
    if (!key_pos) return false;
    
    const char *value_start = key_pos + strlen(search_key);
    while (*value_start == ' ' || *value_start == '\t') value_start++;
    
    if (*value_start != '"') return false;
    value_start++;
    
    const char *value_end = strchr(value_start, '"');
    if (!value_end) return false;
    
    size_t len = value_end - value_start;
    if (len >= value_size) len = value_size - 1;
    
    strncpy(value, value_start, len);
    value[len] = '\0';
    
    return true;
}

bool json_get_bool(const char *json, const char *key, bool *value) {
    if (!json || !key || !value) return false;
    
    char search_key[256];
    snprintf(search_key, sizeof(search_key), "\"%s\":", key);
    
    const char *key_pos = strstr(json, search_key);
    if (!key_pos) return false;
    
    const char *value_start = key_pos + strlen(search_key);
    while (*value_start == ' ' || *value_start == '\t') value_start++;
    
    if (strncmp(value_start, "true", 4) == 0) {
        *value = true;
        return true;
    } else if (strncmp(value_start, "false", 5) == 0) {
        *value = false;
        return true;
    }
    
    return false;
}

bool json_get_int(const char *json, const char *key, int *value) {
    if (!json || !key || !value) return false;
    
    char search_key[256];
    snprintf(search_key, sizeof(search_key), "\"%s\":", key);
    
    const char *key_pos = strstr(json, search_key);
    if (!key_pos) return false;
    
    const char *value_start = key_pos + strlen(search_key);
    while (*value_start == ' ' || *value_start == '\t') value_start++;
    
    char *endptr;
    long val = strtol(value_start, &endptr, 10);
    if (endptr == value_start) return false;
    
    *value = (int)val;
    return true;
}

bool json_get_size_t(const char *json, const char *key, size_t *value) {
    if (!json || !key || !value) return false;
    
    char search_key[256];
    snprintf(search_key, sizeof(search_key), "\"%s\":", key);
    
    const char *key_pos = strstr(json, search_key);
    if (!key_pos) return false;
    
    const char *value_start = key_pos + strlen(search_key);
    while (*value_start == ' ' || *value_start == '\t') value_start++;
    
    char *endptr;
    unsigned long val = strtoul(value_start, &endptr, 10);
    if (endptr == value_start) return false;
    
    *value = (size_t)val;
    return true;
}

// Platform utilities
const char* updater_get_platform(void) {
    #ifdef _WIN32
        return "windows";
    #elif __APPLE__
        return "macos";
    #elif __linux__
        return "linux";
    #else
        return "unknown";
    #endif
}

const char* updater_get_executable_path(void) {
    static char path[UPDATER_PATH_MAX_LEN];
    
    #ifdef _WIN32
        if (GetModuleFileName(NULL, path, sizeof(path)) > 0) {
            return path;
        }
    #elif __APPLE__
        uint32_t size = sizeof(path);
        if (_NSGetExecutablePath(path, &size) == 0) {
            return path;
        }
    #elif __linux__
        ssize_t len = readlink("/proc/self/exe", path, sizeof(path) - 1);
        if (len != -1) {
            path[len] = '\0';
            return path;
        }
    #endif
    
    return NULL;
}

// Update operations
bool updater_check_for_updates(updater_ctx_t *ctx, updater_info_t *update_info) {
    if (!ctx || !update_info) return false;
    
    if (ctx->check_in_progress) return false;
    ctx->check_in_progress = true;
    ctx->status = UPDATER_STATUS_CHECKING;
    
    char url[UPDATER_URL_MAX_LEN];
    snprintf(url, sizeof(url), "%s/version/check", ctx->api_base_url);
    
    http_response_t *response = http_response_create();
    if (!response) {
        ctx->check_in_progress = false;
        ctx->status = UPDATER_STATUS_ERROR;
        return false;
    }
    
    bool success = http_get_with_version_headers(url, response, ctx->current_version, ctx->platform);
    if (!success || !response->data) {
        http_response_destroy(response);
        ctx->check_in_progress = false;
        ctx->status = UPDATER_STATUS_ERROR;
        return false;
    }
    
    // Parse JSON response
    bool update_available = false;
    if (!json_get_bool(response->data, "updateAvailable", &update_available)) {
        http_response_destroy(response);
        ctx->check_in_progress = false;
        ctx->status = UPDATER_STATUS_ERROR;
        return false;
    }
    
    if (update_available) {
        json_get_string(response->data, "version", update_info->version, UPDATER_VERSION_MAX_LEN);
        json_get_string(response->data, "downloadUrl", update_info->download_url, UPDATER_URL_MAX_LEN);
        json_get_string(response->data, "checksum", update_info->checksum, UPDATER_CHECKSUM_MAX_LEN);
        json_get_string(response->data, "changelog", update_info->changelog, UPDATER_CHANGELOG_MAX_LEN);
        json_get_bool(response->data, "critical", &update_info->is_critical);
        
        int download_size_int;
        if (json_get_int(response->data, "downloadSize", &download_size_int)) {
            update_info->download_size = (size_t)download_size_int;
        }
        
        json_get_int(response->data, "rolloutPercentage", &update_info->rollout_percentage);
        
        // Copy to context
        memcpy(&ctx->current_update, update_info, sizeof(updater_info_t));
        ctx->status = UPDATER_STATUS_UPDATE_AVAILABLE;
    } else {
        ctx->status = UPDATER_STATUS_NO_UPDATE;
    }
    
    ctx->last_check_time = time(NULL);
    http_response_destroy(response);
    ctx->check_in_progress = false;
    
    return update_available;
}

bool updater_download_update(updater_ctx_t *ctx, const updater_info_t *update_info,
                            const char *output_path) {
    if (!ctx || !update_info || !output_path) return false;
    
    ctx->status = UPDATER_STATUS_DOWNLOADING;
    
    bool success = http_download(update_info->download_url, output_path,
                                ctx->progress_callback, ctx->user_data);
    
    if (success) {
        // Verify checksum if available
        if (strlen(update_info->checksum) > 0) {
            if (!updater_verify_checksum(output_path, update_info->checksum)) {
                remove(output_path);
                updater_set_last_error(UPDATER_ERROR_CHECKSUM_MISMATCH);
                ctx->status = UPDATER_STATUS_ERROR;
                return false;
            }
        }
    } else {
        ctx->status = UPDATER_STATUS_ERROR;
    }
    
    return success;
}

// Error handling functions
const char* updater_error_string(updater_error_t error) {
    switch (error) {
        case UPDATER_ERROR_NONE: return "No error";
        case UPDATER_ERROR_MEMORY: return "Memory allocation error";
        case UPDATER_ERROR_NETWORK: return "Network error";
        case UPDATER_ERROR_IO: return "I/O error";
        case UPDATER_ERROR_INVALID_VERSION: return "Invalid version";
        case UPDATER_ERROR_CHECKSUM_MISMATCH: return "Checksum mismatch";
        case UPDATER_ERROR_PERMISSION_DENIED: return "Permission denied";
        case UPDATER_ERROR_DISK_SPACE: return "Insufficient disk space";
        case UPDATER_ERROR_CORRUPTED_FILE: return "Corrupted file";
        case UPDATER_ERROR_UNSUPPORTED_PLATFORM: return "Unsupported platform";
        default: return "Unknown error";
    }
}

updater_error_t updater_get_last_error(void) {
    return last_error;
}

void updater_set_last_error(updater_error_t error) {
    last_error = error;
}

