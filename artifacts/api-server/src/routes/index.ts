import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import catalogRouter from "./catalog";
import catalogExtrasRouter from "./catalog-extras";
import cartRouter from "./cart";
import favoritesRouter from "./favorites";
import ordersRouter from "./orders";
import adminRouter from "./admin";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(catalogRouter);
router.use(catalogExtrasRouter);
router.use(cartRouter);
router.use(favoritesRouter);
router.use(ordersRouter);
router.use(adminRouter);
router.use(storageRouter);

export default router;
