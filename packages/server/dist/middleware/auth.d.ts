import { Request, Response, NextFunction } from 'express';
import { TokenPayload } from '../auth/jwt';
export interface AuthenticatedRequest extends Request {
    user?: TokenPayload;
}
export declare function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
