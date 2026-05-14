import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  let initOptions: admin.AppOptions = { projectId: process.env.FIREBASE_PROJECT_ID };
  if (serviceAccountJson) {
    try {
      initOptions = { credential: admin.credential.cert(JSON.parse(serviceAccountJson)) };
    } catch {
      console.warn('[Firebase] FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON — falling back to projectId');
    }
  }
  admin.initializeApp(initOptions);
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }

    const token = authHeader.split('Bearer ')[1];

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      request.user = decodedToken;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
