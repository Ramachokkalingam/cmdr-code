#ifndef UPDATER_H
#define UPDATER_H

#include <string>
#include <functional>

class Updater {
public:
    // Progress callback: (current_bytes, total_bytes) -> void
    using ProgressCallback = std::function<void(size_t, size_t)>;
    
    Updater();
    ~Updater();
    
    // Check if an update is available
    bool checkForUpdates(const std::string& currentVersion, std::string& latestVersion);
    
    // Download update file
    bool downloadUpdate(const std::string& version, const std::string& platform, 
                       const std::string& outputPath, ProgressCallback callback = nullptr);
    
    // Install update and restart application
    bool installUpdate(const std::string& updateFilePath);
    
    // Get current executable path
    std::string getCurrentExecutablePath() const;
    
    // Get platform identifier
    std::string getPlatform() const;
    
    // Verify update file integrity
    bool verifyUpdateFile(const std::string& filePath, const std::string& expectedChecksum);
    
private:
    std::string apiBaseUrl;
    std::string currentExecutablePath;
    
    // Platform-specific installation methods
    bool installLinuxUpdate(const std::string& updateFilePath);
    bool installWindowsUpdate(const std::string& updateFilePath);
    bool installMacUpdate(const std::string& updateFilePath);
    
    // Helper methods
    std::string createWindowsUpdateScript(const std::string& updateFilePath);
    void restartApplication();
    bool createBackup();
    bool restoreBackup();
    std::string calculateChecksum(const std::string& filePath);
    
    // HTTP client methods
    std::string httpGet(const std::string& url);
    bool httpDownload(const std::string& url, const std::string& outputPath, ProgressCallback callback);
};

#endif // UPDATER_H
