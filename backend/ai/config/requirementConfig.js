module.exports = {
  // Accepted upload mimetype for the client requirement document
  ALLOWED_MIME_TYPE: 'application/pdf',

  // Max upload size (5 MB)
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024,

  // How many matched resources to return per requirement line item
  MAX_RESOURCES_PER_REQUIREMENT: 10
};
