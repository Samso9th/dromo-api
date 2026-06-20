// Passport (@types/passport) already declares `req.user?: Express.User`. We attach our Sequelize
// User there and read it back through the `reqUser()` helper (src/utils/req-user.ts), which keeps
// the typing clean without fighting Passport's empty Express.User interface.
export {};
