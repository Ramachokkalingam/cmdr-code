#include "updater.h"
#include <iostream>
#include <filesystem>
#include <fstream>
#include <sstream>
#include <thread>
#include <chrono>
#include <cstdlib>
#include <algorithm>

#ifdef _WIN32
#include <windows.h>
#include <shellapi.h>
#elif __APPLE__
#include <unistd.h>
#include <mach-o/dyld.h>
#elif __linux__
#include <unistd.h>
#include <sys/types.h>
#include <sys/wait.h>
#endif

// For HTTP requests - you might want to use libcurl in production
#include <curl/curl.h>

Updater::Updater() {
    apiBaseUrl = "http://localhost:8000/api"; // Configure as needed
    currentExecutablePath = getCurrentExecutablePath();
    
    // Initialize curl
    curl_global_init(CURL_GLOBAL_DEFAULT);
}

Updater::~Updater() {
    curl_global_cleanup();
}

std::string Updater::getCurrentExecutablePath() const {
    #ifdef _WIN32
        char path[MAX_PATH];
        GetModuleFileName(NULL, path, MAX_PATH);
        return std::string(path);
    #elif __APPLE__
        char path[1024];
        uint32_t size = sizeof(path);
        if (_NSGetExecutablePath(path, &size) == 0) {
            return std::string(path);
        }
        return "";
    #elif __linux__
        char path[1024];
        ssize_t len = readlink("/proc/self/exe", path, sizeof(path) - 1);
        if (len != -1) {
            path[len] = '\0';
            return std::string(path);
        }
        return "";
    #endif
}

std::string Updater::getPlatform() const {
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

// Callback for curl to write data
struct WriteCallbackData {
    std::string* buffer;
    ProgressCallback progressCallback;
    size_t totalSize;
    size_t currentSize;
};

static size_t WriteCallback(void* contents, size_t size, size_t nmemb, WriteCallbackData* data) {
    size_t totalSize = size * nmemb;
    data->buffer->append((char*)contents, totalSize);
    
    data->currentSize += totalSize;
    if (data->progressCallback && data->totalSize > 0) {
        data->progressCallback(data->currentSize, data->totalSize);
    }
    
    return totalSize;
}

static size_t FileWriteCallback(void* contents, size_t size, size_t nmemb, std::ofstream* file) {
    size_t totalSize = size * nmemb;
    file->write((char*)contents, totalSize);
    return totalSize;
}

std::string Updater::httpGet(const std::string& url) {
    CURL* curl;
    CURLcode res;
    std::string response;
    
    curl = curl_easy_init();
    if (curl) {
        WriteCallbackData data;
        data.buffer = &response;
        data.progressCallback = nullptr;
        data.totalSize = 0;
        data.currentSize = 0;
        
        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &data);
        curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
        curl_easy_setopt(curl, CURLOPT_TIMEOUT, 30L);
        
        // Set headers
        struct curl_slist* headers = nullptr;
        headers = curl_slist_append(headers, "Current-Version: 1.0.0");
        std::string platformHeader = "Platform: " + getPlatform();
        headers = curl_slist_append(headers, platformHeader.c_str());
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        
        res = curl_easy_perform(curl);
        
        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
        
        if (res == CURLE_OK) {
            return response;
        }
    }
    
    return "";
}

bool Updater::httpDownload(const std::string& url, const std::string& outputPath, ProgressCallback callback) {
    CURL* curl;
    CURLcode res;
    std::ofstream file(outputPath, std::ios::binary);
    
    if (!file.is_open()) {
        return false;
    }
    
    curl = curl_easy_init();
    if (curl) {
        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, FileWriteCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &file);
        curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
        curl_easy_setopt(curl, CURLOPT_TIMEOUT, 300L); // 5 minutes timeout
        
        // Progress callback
        if (callback) {
            // This is simplified - in practice you'd need more complex progress tracking
            curl_easy_setopt(curl, CURLOPT_NOPROGRESS, 0L);
        }
        
        res = curl_easy_perform(curl);
        curl_easy_cleanup(curl);
        
        file.close();
        
        return res == CURLE_OK;
    }
    
    file.close();
    return false;
}

bool Updater::checkForUpdates(const std::string& currentVersion, std::string& latestVersion) {
    try {
        std::string url = apiBaseUrl + "/version/check";
        std::string response = httpGet(url);
        
        if (response.empty()) {
            return false;
        }
        
        // Simple JSON parsing (in production, use a proper JSON library)
        size_t updateAvailablePos = response.find("\"updateAvailable\"");
        if (updateAvailablePos == std::string::npos) {
            return false;
        }
        
        size_t truePos = response.find("true", updateAvailablePos);
        if (truePos == std::string::npos) {
            return false;
        }
        
        // Extract version (simplified parsing)
        size_t versionPos = response.find("\"version\"");
        if (versionPos != std::string::npos) {
            size_t colonPos = response.find(":", versionPos);
            size_t quoteStart = response.find("\"", colonPos);
            size_t quoteEnd = response.find("\"", quoteStart + 1);
            
            if (quoteStart != std::string::npos && quoteEnd != std::string::npos) {
                latestVersion = response.substr(quoteStart + 1, quoteEnd - quoteStart - 1);
                return true;
            }
        }
        
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Error checking for updates: " << e.what() << std::endl;
        return false;
    }
}

bool Updater::downloadUpdate(const std::string& version, const std::string& platform, 
                            const std::string& outputPath, ProgressCallback callback) {
    try {
        std::string url = apiBaseUrl + "/version/download/" + version + "/" + platform;
        return httpDownload(url, outputPath, callback);
    } catch (const std::exception& e) {
        std::cerr << "Error downloading update: " << e.what() << std::endl;
        return false;
    }
}

bool Updater::installUpdate(const std::string& updateFilePath) {
    try {
        #ifdef _WIN32
            return installWindowsUpdate(updateFilePath);
        #elif __APPLE__
            return installMacUpdate(updateFilePath);
        #else
            return installLinuxUpdate(updateFilePath);
        #endif
    } catch (const std::exception& e) {
        std::cerr << "Update installation failed: " << e.what() << std::endl;
        return false;
    }
}

bool Updater::installLinuxUpdate(const std::string& updateFilePath) {
    try {
        // Create backup of current executable
        std::string backupPath = currentExecutablePath + ".backup";
        if (!createBackup()) {
            std::cerr << "Failed to create backup" << std::endl;
            return false;
        }
        
        // Copy update file to current executable location
        std::filesystem::copy_file(updateFilePath, currentExecutablePath, 
                                 std::filesystem::copy_options::overwrite_existing);
        
        // Make executable
        std::filesystem::permissions(
            currentExecutablePath,
            std::filesystem::perms::owner_exec | 
            std::filesystem::perms::group_exec | 
            std::filesystem::perms::others_exec,
            std::filesystem::perm_options::add
        );
        
        // Restart application
        restartApplication();
        return true;
        
    } catch (const std::exception& e) {
        std::cerr << "Linux update installation failed: " << e.what() << std::endl;
        restoreBackup();
        return false;
    }
}

bool Updater::installWindowsUpdate(const std::string& updateFilePath) {
    try {
        // Create batch script for update
        std::string scriptPath = createWindowsUpdateScript(updateFilePath);
        
        // Execute batch script
        SHELLEXECUTEINFO shExInfo = {0};
        shExInfo.cbSize = sizeof(shExInfo);
        shExInfo.fMask = SEE_MASK_NOCLOSEPROCESS;
        shExInfo.hwnd = 0;
        shExInfo.lpVerb = L"open";
        shExInfo.lpFile = (LPCWSTR)scriptPath.c_str();
        shExInfo.lpParameters = 0;
        shExInfo.lpDirectory = 0;
        shExInfo.nShow = SW_HIDE;
        shExInfo.hInstApp = 0;
        
        if (ShellExecuteEx(&shExInfo)) {
            // Exit current process
            std::exit(0);
            return true;
        }
        
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Windows update installation failed: " << e.what() << std::endl;
        return false;
    }
}

bool Updater::installMacUpdate(const std::string& updateFilePath) {
    try {
        // For .dmg files, mount and copy
        // For .app bundles, copy directly
        // This is a simplified implementation
        
        createBackup();
        
        std::filesystem::copy_file(updateFilePath, currentExecutablePath, 
                                 std::filesystem::copy_options::overwrite_existing);
        
        std::filesystem::permissions(
            currentExecutablePath,
            std::filesystem::perms::owner_exec | 
            std::filesystem::perms::group_exec | 
            std::filesystem::perms::others_exec,
            std::filesystem::perm_options::add
        );
        
        restartApplication();
        return true;
        
    } catch (const std::exception& e) {
        std::cerr << "Mac update installation failed: " << e.what() << std::endl;
        restoreBackup();
        return false;
    }
}

std::string Updater::createWindowsUpdateScript(const std::string& updateFilePath) {
    std::string scriptPath = "cmdr_update.bat";
    std::ofstream script(scriptPath);
    
    script << "@echo off\n";
    script << "timeout /t 2 /nobreak >nul\n";
    script << "copy \"" << updateFilePath << "\" \"" << currentExecutablePath << "\"\n";
    script << "start \"\" \"" << currentExecutablePath << "\"\n";
    script << "del \"%~f0\"\n";
    
    script.close();
    return scriptPath;
}

void Updater::restartApplication() {
    #ifdef _WIN32
        ShellExecute(NULL, L"open", (LPCWSTR)currentExecutablePath.c_str(), NULL, NULL, SW_SHOWNORMAL);
        std::exit(0);
    #else
        // Fork and exec new process
        pid_t pid = fork();
        if (pid == 0) {
            // Child process
            std::this_thread::sleep_for(std::chrono::seconds(1)); // Wait for parent to exit
            execl(currentExecutablePath.c_str(), currentExecutablePath.c_str(), nullptr);
        } else if (pid > 0) {
            // Parent process - exit
            std::exit(0);
        }
    #endif
}

bool Updater::createBackup() {
    try {
        std::string backupPath = currentExecutablePath + ".backup";
        std::filesystem::copy_file(currentExecutablePath, backupPath, 
                                 std::filesystem::copy_options::overwrite_existing);
        return true;
    } catch (const std::exception& e) {
        std::cerr << "Failed to create backup: " << e.what() << std::endl;
        return false;
    }
}

bool Updater::restoreBackup() {
    try {
        std::string backupPath = currentExecutablePath + ".backup";
        if (std::filesystem::exists(backupPath)) {
            std::filesystem::copy_file(backupPath, currentExecutablePath, 
                                     std::filesystem::copy_options::overwrite_existing);
            std::filesystem::remove(backupPath);
            return true;
        }
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Failed to restore backup: " << e.what() << std::endl;
        return false;
    }
}

std::string Updater::calculateChecksum(const std::string& filePath) {
    // Simplified checksum calculation - in production use SHA256
    try {
        std::ifstream file(filePath, std::ios::binary);
        std::ostringstream ss;
        ss << file.rdbuf();
        std::string content = ss.str();
        
        // Simple hash
        std::hash<std::string> hasher;
        size_t hash = hasher(content);
        
        std::ostringstream hashStr;
        hashStr << std::hex << hash;
        return hashStr.str().substr(0, 12);
    } catch (const std::exception& e) {
        return "";
    }
}

bool Updater::verifyUpdateFile(const std::string& filePath, const std::string& expectedChecksum) {
    if (expectedChecksum.empty()) {
        return true; // Skip verification if no checksum provided
    }
    
    std::string actualChecksum = calculateChecksum(filePath);
    return actualChecksum == expectedChecksum;
}
