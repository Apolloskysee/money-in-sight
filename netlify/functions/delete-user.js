// Delete user account via Admin SDK
// This handles the case where client-side user.delete() fails due to reauthentication requirement

const admin = require('firebase-admin');

// Lazy initialization of Admin SDK so missing env vars cause runtime error responses
let adminInitialized = false;

async function initAdmin() {
    if (adminInitialized) return;
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set');
    }

    const databaseURL = process.env.FIREBASE_DATABASE_URL || null;
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
        databaseURL
    });
    adminInitialized = true;
}

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        await initAdmin();
    } catch (initErr) {
        console.error('Admin SDK initialization failed:', initErr);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Admin SDK not configured', details: initErr.message })
        };
    }

    try {
        const { uid, email } = JSON.parse(event.body || '{}');

        if (!uid) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing uid parameter' })
            };
        }

        console.log(`Deleting user account: ${email || uid}`);

        const auth = admin.auth();
        const db = admin.firestore();

        // Delete user from Firebase Auth
        await auth.deleteUser(uid);
        console.log(`✅ Deleted from Auth: ${uid}`);

        // Delete user document from Firestore
        await db.collection('users').doc(uid).delete();
        console.log(`✅ Deleted user document: ${uid}`);

        // Helper to delete collection by query in batches
        async function deleteQueryBatch(collectionRef, field, op, value) {
            const snapshot = await collectionRef.where(field, op, value).get();
            if (snapshot.empty) return 0;
            const batch = db.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            return snapshot.docs.length;
        }

        const deletedTransactions = await deleteQueryBatch(db.collection('transactions'), 'userId', '==', uid);
        if (deletedTransactions) console.log(`✅ Deleted ${deletedTransactions} transactions`);

        const deletedGoals = await deleteQueryBatch(db.collection('goals'), 'userId', '==', uid);
        if (deletedGoals) console.log(`✅ Deleted ${deletedGoals} goals`);

        const deletedTasks = await deleteQueryBatch(db.collection('tasks'), 'userId', '==', uid);
        if (deletedTasks) console.log(`✅ Deleted ${deletedTasks} tasks`);

        const deletedCodes = await deleteQueryBatch(db.collection('verificationCodes'), 'userId', '==', uid);
        if (deletedCodes) console.log(`✅ Deleted ${deletedCodes} verification codes`);

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
