// Continued from updater.cpp - remaining implementation

#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stddef.h>
#include <unistd.h>
#include <sys/stat.h>
#include <errno.h>

#include "updater.h"

// Forward declarations
static bool install_linux_update(updater_ctx_t *ctx, const char *update_file_path);

// Platform-specific implementation functions

bool updater_install_update(updater_ctx_t *ctx, const char *update_file_path) {
    if (!ctx || !update_file_path) return false;
    
    ctx->status = UPDATER_STATUS_INSTALLING;
    ctx->install_in_progress = true;
    
    // Create backup first
    if (!updater_create_backup(ctx)) {
        ctx->status = UPDATER_STATUS_ERROR;
        ctx->install_in_progress = false;
        return false;
    }
    
    bool success = false;
    
    #ifdef __linux__
    success = install_linux_update(ctx, update_file_path);
    #elif _WIN32
    success = install_windows_update(ctx, update_file_path);
    #elif __APPLE__
    success = install_mac_update(ctx, update_file_path);
    #else
    updater_set_last_error(UPDATER_ERROR_UNSUPPORTED_PLATFORM);
    #endif
    
    if (success) {
        ctx->status = UPDATER_STATUS_COMPLETE;
        if (ctx->completion_callback) {
            ctx->completion_callback(true, "Update installed successfully", ctx->user_data);
        }
    } else {
        ctx->status = UPDATER_STATUS_ERROR;
        if (ctx->completion_callback) {
            ctx->completion_callback(false, "Update installation failed", ctx->user_data);
        }
    }
    
    ctx->install_in_progress = false;
    return success;
}

// Platform-specific installation functions
#ifdef __linux__
static bool install_linux_update(updater_ctx_t *ctx, const char *update_file_path) {
    // Make the update file executable
    if (chmod(update_file_path, 0755) != 0) {
        updater_set_last_error(UPDATER_ERROR_PERMISSION_DENIED);
        return false;
    }
    
    // Copy new binary over current one
    char backup_path[UPDATER_PATH_MAX_LEN];
    snprintf(backup_path, sizeof(backup_path), "%s/cmdr.backup", ctx->backup_directory);
    
    // Copy current binary to backup
    char cp_cmd[UPDATER_PATH_MAX_LEN * 2 + 20];
    snprintf(cp_cmd, sizeof(cp_cmd), "cp '%s' '%s'", ctx->current_executable_path, backup_path);
    
    if (system(cp_cmd) != 0) {
        updater_set_last_error(UPDATER_ERROR_IO);
        return false;
    }
    
    // Replace current binary with update
    snprintf(cp_cmd, sizeof(cp_cmd), "cp '%s' '%s'", update_file_path, ctx->current_executable_path);
    
    if (system(cp_cmd) != 0) {
        updater_set_last_error(UPDATER_ERROR_IO);
        return false;
    }
    
    // Clean up update file
    remove(update_file_path);
    
    return true;
}
#endif

#ifdef _WIN32
static bool install_windows_update(updater_ctx_t *ctx, const char *update_file_path) {
    char script_path[UPDATER_PATH_MAX_LEN];
    snprintf(script_path, sizeof(script_path), "%s\\update_script.bat", ctx->backup_directory);
    
    FILE *script = fopen(script_path, "w");
    if (!script) {
        updater_set_last_error(UPDATER_ERROR_IO);
        return false;
    }
    
    fprintf(script, "@echo off\n");
    fprintf(script, "timeout /t 2 /nobreak >nul\n");
    fprintf(script, "copy \"%s\" \"%s.backup\" /y\n", ctx->current_executable_path, ctx->current_executable_path);
    fprintf(script, "copy \"%s\" \"%s\" /y\n", update_file_path, ctx->current_executable_path);
    fprintf(script, "del \"%s\"\n", update_file_path);
    fprintf(script, "del \"%s\"\n", script_path);
    fprintf(script, "start \"\" \"%s\"\n", ctx->current_executable_path);
    
    fclose(script);
    
    // Execute the script
    SHELLEXECUTEINFO sei = {0};
    sei.cbSize = sizeof(SHELLEXECUTEINFO);
    sei.fMask = SEE_MASK_NOCLOSEPROCESS;
    sei.lpVerb = "open";
    sei.lpFile = script_path;
    sei.nShow = SW_HIDE;
    
    if (!ShellExecuteEx(&sei)) {
        updater_set_last_error(UPDATER_ERROR_IO);
        return false;
    }
    
    return true;
}
#endif

#ifdef __APPLE__
static bool install_mac_update(updater_ctx_t *ctx, const char *update_file_path) {
    // Similar to Linux but with macOS-specific considerations
    return install_linux_update(ctx, update_file_path);
}
#endif

bool updater_create_backup(updater_ctx_t *ctx) {
    if (!ctx) return false;
    
    // Create backup directory
    #ifdef _WIN32
    if (_mkdir(ctx->backup_directory) != 0 && errno != EEXIST) {
    #else
    if (mkdir(ctx->backup_directory, 0755) != 0 && errno != EEXIST) {
    #endif
        updater_set_last_error(UPDATER_ERROR_IO);
        return false;
    }
    
    char backup_path[UPDATER_PATH_MAX_LEN];
    snprintf(backup_path, sizeof(backup_path), "%s/cmdr.backup", ctx->backup_directory);
    
    FILE *src = fopen(ctx->current_executable_path, "rb");
    if (!src) {
        updater_set_last_error(UPDATER_ERROR_IO);
        return false;
    }
    
    FILE *dst = fopen(backup_path, "wb");
    if (!dst) {
        fclose(src);
        updater_set_last_error(UPDATER_ERROR_IO);
        return false;
    }
    
    char buffer[4096];
    size_t bytes;
    while ((bytes = fread(buffer, 1, sizeof(buffer), src)) > 0) {
        if (fwrite(buffer, 1, bytes, dst) != bytes) {
            fclose(src);
            fclose(dst);
            remove(backup_path);
            updater_set_last_error(UPDATER_ERROR_IO);
            return false;
        }
    }
    
    fclose(src);
    fclose(dst);
    
    return true;
}

bool updater_rollback_to_backup(updater_ctx_t *ctx) {
    if (!ctx) return false;
    
    char backup_path[UPDATER_PATH_MAX_LEN];
    snprintf(backup_path, sizeof(backup_path), "%s/cmdr.backup", ctx->backup_directory);
    
    FILE *src = fopen(backup_path, "rb");
    if (!src) {
        updater_set_last_error(UPDATER_ERROR_IO);
        return false;
    }
    
    FILE *dst = fopen(ctx->current_executable_path, "wb");
    if (!dst) {
        fclose(src);
        updater_set_last_error(UPDATER_ERROR_IO);
        return false;
    }
    
    char buffer[4096];
    size_t bytes;
    while ((bytes = fread(buffer, 1, sizeof(buffer), src)) > 0) {
        if (fwrite(buffer, 1, bytes, dst) != bytes) {
            fclose(src);
            fclose(dst);
            updater_set_last_error(UPDATER_ERROR_IO);
            return false;
        }
    }
    
    fclose(src);
    fclose(dst);
    
    return true;
}

bool updater_verify_installation(updater_ctx_t *ctx) {
    if (!ctx) return false;
    
    // Check if executable exists and is executable
    if (access(ctx->current_executable_path, X_OK) != 0) {
        return false;
    }
    
    return true;
}

// Checksum verification
bool updater_verify_checksum(const char *file_path, const char *expected_checksum) {
    if (!file_path || !expected_checksum) return false;
    
    char *calculated = updater_calculate_checksum(file_path);
    if (!calculated) return false;
    
    bool match = (strcmp(calculated, expected_checksum) == 0);
    free(calculated);
    
    return match;
}

char* updater_calculate_checksum(const char *file_path) {
    if (!file_path) return NULL;
    
    // Simple implementation using system sha256sum command
    char cmd[UPDATER_PATH_MAX_LEN + 50];
    
    #ifdef _WIN32
    snprintf(cmd, sizeof(cmd), "certutil -hashfile \"%s\" SHA256", file_path);
    #else
    snprintf(cmd, sizeof(cmd), "sha256sum \"%s\"", file_path);
    #endif
    
    FILE *fp = popen(cmd, "r");
    if (!fp) return NULL;
    
    char *checksum = malloc(UPDATER_CHECKSUM_MAX_LEN);
    if (!checksum) {
        pclose(fp);
        return NULL;
    }
    
    if (fgets(checksum, UPDATER_CHECKSUM_MAX_LEN, fp) == NULL) {
        free(checksum);
        pclose(fp);
        return NULL;
    }
    
    pclose(fp);
    
    // Extract just the hash part (remove filename)
    char *space = strchr(checksum, ' ');
    if (space) *space = '\0';
    
    // Remove newline
    char *newline = strchr(checksum, '\n');
    if (newline) *newline = '\0';
    
    return checksum;
}

// Utility functions
const char* updater_status_to_string(updater_status_t status) {
    switch (status) {
        case UPDATER_STATUS_NO_UPDATE: return "no_update";
        case UPDATER_STATUS_UPDATE_AVAILABLE: return "update_available";
        case UPDATER_STATUS_CHECKING: return "checking";
        case UPDATER_STATUS_DOWNLOADING: return "downloading";
        case UPDATER_STATUS_INSTALLING: return "installing";
        case UPDATER_STATUS_COMPLETE: return "complete";
        case UPDATER_STATUS_ERROR: return "error";
        case UPDATER_STATUS_ROLLBACK_REQUIRED: return "rollback_required";
        default: return "unknown";
    }
}

const char* updater_channel_to_string(updater_channel_t channel) {
    switch (channel) {
        case UPDATER_CHANNEL_STABLE: return "stable";
        case UPDATER_CHANNEL_BETA: return "beta";
        case UPDATER_CHANNEL_NIGHTLY: return "nightly";
        default: return "stable";
    }
}
