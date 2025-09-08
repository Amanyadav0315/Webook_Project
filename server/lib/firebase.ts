import admin from 'firebase-admin';

class FirebaseService {
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (this.initialized) return;

    try {
      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      };

      if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
        console.warn('Firebase credentials not configured, FCM notifications will be disabled');
        return;
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      });

      this.initialized = true;
      console.log('Firebase Admin SDK initialized');
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
    }
  }

  async sendNotification(
    userId: string,
    orderId: string,
    deviceToken?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.initialized) {
      return { success: false, error: 'Firebase not initialized' };
    }

    const isDryRun = process.env.FCM_DRY_RUN === 'true';
    
    let message: admin.messaging.Message;

    if (deviceToken) {
      message = {
        notification: {
          title: 'New Order',
          body: `Order ${orderId} placed by ${userId}`,
        },
        data: {
          orderId,
          userId,
          type: 'order.created',
        },
        token: deviceToken,
      };
    } else {
      message = {
        notification: {
          title: 'New Order',
          body: `Order ${orderId} placed by ${userId}`,
        },
        data: {
          orderId,
          userId,
          type: 'order.created',
        },
        topic: 'orders',
      };
    }

    try {
      if (isDryRun) {
        console.log('FCM DRY RUN - Would send message:', JSON.stringify(message, null, 2));
        return { 
          success: true, 
          messageId: `dry-run-${Date.now()}` 
        };
      }

      const response = await admin.messaging().send(message);
      console.log('FCM message sent successfully:', response);
      
      return { 
        success: true, 
        messageId: response 
      };
    } catch (error: any) {
      console.error('Failed to send FCM message:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const firebaseService = new FirebaseService();
