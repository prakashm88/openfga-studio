export const config = {
  apiUrl:
    import.meta.env.VITE_OPENFGA_API_URL ||
    "https://api.playground-us1.fga.dev",
  apiVersion: "v1",
  storeId: import.meta.env.VITE_OPENFGA_STORE_ID || "",
  apiToken: import.meta.env.VITE_OPENFGA_API_TOKEN || "",
  defaultAuthorizationModel: `model
  schema 1.1

type user

type group
  relations
    define member: [user]

type folder
  relations
    define can_create_file: owner
    define owner: [user]
    define parent: [folder]
    define viewer: [user, user:*, group#member] or owner or viewer from parent
    define tmpviewer: [user with non_expired_grant]

type doc
  relations
    define can_change_owner: owner
    define owner: [user]
    define parent: [folder]
    define can_read: viewer or owner or viewer from parent
    define can_share: owner or owner from parent
    define viewer: [user, user:*, group#member]
    define can_write: owner or owner from parent

condition non_expired_grant(current_time: timestamp, grant_time: timestamp, grant_duration: duration) {
  current_time < grant_time + grant_duration
}`,
};
