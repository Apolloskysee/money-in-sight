// Delete user account via Admin SDK
// This handles the case where client-side user.delete() fails due to reauthentication requirement

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK with environment variable
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set');
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });
}

const auth = admin.auth();
const db = admin.firestore();

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { uid, email } = JSON.parse(event.body);

        if (!uid) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing uid parameter' })
            };
        }

        // Verify that the requesting user is the one being deleted
        // (optional: check Authorization header if client sends Firebase ID token)

        console.log(`Deleting user account: ${email || uid}`);

        // Delete user from Firebase Auth
        await auth.deleteUser(uid);
        console.log(`✅ Deleted from Auth: ${uid}`);

        // Delete user document from Firestore
        await db.collection('users').doc(uid).delete();
        console.log(`✅ Deleted user document: ${uid}`);

        // Delete transactions
        const transactionsSnap = await db.collection('transactions').where('userId', '==', uid).get();
        const batch1 = db.batch();
        transactionsSnap.docs.forEach(doc => batch1.delete(doc.ref));
        if (transactionsSnap.docs.length > 0) {
            await batch1.commit();
            console.log(`✅ Deleted ${transactionsSnap.docs.length} transactions`);
        }

        // Delete goals
        const goalsSnap = await db.collection('goals').where('userId', '==', uid).get();
        const batch2 = db.batch();
        goalsSnap.docs.forEach(doc => batch2.delete(doc.ref));
        if (goalsSnap.docs.length > 0) {
            await batch2.commit();
            console.log(`✅ Deleted ${goalsSnap.docs.length} goals`);
        }

        // Delete tasks
        const tasksSnap = await db.collection('tasks').where('userId', '==', uid).get();
        const batch3 = db.batch();
        tasksSnap.docs.forEach(doc => batch3.delete(doc.ref));
        if (tasksSnap.docs.length > 0) {
            await batch3.commit();
            console.log(`✅ Deleted ${tasksSnap.docs.length} tasks`);
        }

        // Delete verification codes
        const codesSnap = await db.collection('verificationCodes').where('userId', '==', uid).get();
        const batch4 = db.batch();
        codesSnap.docs.forEach(doc => batch4.delete(doc.ref));
        if (codesSnap.docs.length > 0) {
            await batch4.commit();
            console.log(`✅ Deleted ${codesSnap.docs.length} verification codes`);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'User account successfully deleted' })
        };

    } catch (error) {
        console.error('❌ Error deleting user:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
