const express = require("express");
const router = express.Router();
const { isAuthenticatedUser, authorizeRoles } = require("../middleware/auth");

const {
  createTenant,
  getTenants,
  getTenantById,
  updateTenant,
  deleteTenant,
} = require("../controllers/tenantsController");

router.route("/tenants").post(authorizeRoles(isAuthenticatedUser, ["SuperAdmin"]), createTenant);
router.route("/tenants").get(isAuthenticatedUser, authorizeRoles(["SuperAdmin"]), getTenants);
router
  .route("/tenants/:id")
  .get(isAuthenticatedUser, authorizeRoles(["SuperAdmin"]), getTenantById)
  .put(isAuthenticatedUser, authorizeRoles(["SuperAdmin"]), updateTenant)
  .delete(isAuthenticatedUser, authorizeRoles(["SuperAdmin"]), deleteTenant);

module.exports = router;
