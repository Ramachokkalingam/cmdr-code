#include <libwebsockets.h>
#include <stdbool.h>
#include <time.h>
#include <uv.h>

#include "pty.h"

// client message
#define INPUT '0'
#define RESIZE_TERMINAL '1'
#define PAUSE '2'
#define RESUME '3'
#define JSON_DATA '{'

// server message
#define OUTPUT '0'
#define SET_WINDOW_TITLE '1'
#define SET_PREFERENCES '2'

// url paths
struct endpoints {
  char *ws;
  char *index;
  char *token;
  char *parent;
};

extern volatile bool force_exit;
extern struct lws_context *context;
extern struct server *server;
extern struct endpoints endpoints;

struct pss_http {
  char path[128];
  char *buffer;
  char *ptr;
  size_t len;
};

struct pss_tty {
  bool initialized;
  int initial_cmd_index;
  bool authenticated;
  char user[30];
  char address[50];
  char path[128];
  char session_id[64];  // Session ID for ChatGPT-style session management
  char default_shell[256]; // User-selected shell path
  char **args;
  int argc;

  struct lws *wsi;
  char *buffer;
  size_t len;

  pty_process *process;
  pty_buf_t *pty_buf;

  int lws_close_status;

  // Persistent session connection
  struct persistent_session *persistent_session;
};

typedef struct {
  struct pss_tty *pss;
  bool ws_closed;
} pty_ctx_t;

// Session data structure - like ChatGPT sessions
struct session_data {
  char *id;            // unique session identifier
  char *name;          // user-friendly session name
  char *command;       // command run in this session
  char *working_dir;   // working directory for session
  time_t created_at;   // session creation timestamp
  time_t last_used;    // last access timestamp
  bool is_active;      // whether session is currently active
  bool is_archived;    // whether session is archived
  pid_t process_pid;   // PID of the terminal process (0 if not running)
  char *history;       // terminal history/output (optional)
};

// Session manager - manages all sessions
struct session_manager {
  struct session_data **sessions;  // array of session pointers
  int session_count;               // current number of sessions
  int max_sessions;                // maximum allowed sessions
  char *sessions_file;             // path to sessions persistence file
};

// Forward declarations for session persistence
struct session_registry;
struct persistent_session;

struct server {
  int client_count;        // client count
  char *prefs_json;        // client preferences
  char *credential;        // encoded basic auth credential
  char *auth_header;       // header name used for auth proxy
  char *index;             // custom index.html
  char *command;           // full command line
  char **argv;             // command with arguments
  int argc;                // command + arguments count
  char *cwd;               // working directory
  int sig_code;            // close signal
  char sig_name[20];       // human readable signal string
  bool url_arg;            // allow client to send cli arguments in URL
  bool writable;           // whether clients to write to the TTY
  bool check_origin;       // whether allow websocket connection from different origin
  int max_clients;         // maximum clients to support
  bool once;               // whether accept only one client and exit on disconnection
  bool exit_no_conn;       // whether exit on all clients disconnection
  char socket_path[255];   // UNIX domain socket path
  char terminal_type[30];  // terminal type to report

  uv_loop_t *loop;         // the libuv event loop
  
  // Session management
  struct session_manager *session_mgr;  // ChatGPT-style session manager

  // Session persistence registry
  struct session_registry *persistent_registry;
};

// Session management functions
struct session_manager* session_manager_init();
void session_manager_free(struct session_manager *mgr);
void session_manager_save(struct session_manager *mgr);
void session_manager_load(struct session_manager *mgr);

struct session_data* session_create(struct session_manager *mgr, const char *name, const char *command, const char *cwd);
struct session_data* session_find_by_id(struct session_manager *mgr, const char *id);
bool session_delete(struct session_manager *mgr, const char *id);
bool session_rename(struct session_manager *mgr, const char *id, const char *new_name);
void session_update_last_used(struct session_data *session);
char* session_list_to_json(struct session_manager *mgr);
void session_cleanup_old(struct session_manager *mgr);
void session_delete_by_index(struct session_manager *mgr, int index);
