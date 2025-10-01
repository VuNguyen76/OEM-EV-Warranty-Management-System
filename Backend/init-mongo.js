// MongoDB initialization script
db = db.getSiblingDB('warranty_db');

// Create collections
db.createCollection('users');
db.createCollection('warranties');
db.createCollection('claims');
db.createCollection('servicecenters');

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "role": 1 });
db.users.createIndex({ "status": 1 });
db.users.createIndex({ "serviceCenter.id": 1 });
db.users.createIndex({ "specialization": 1 });
db.users.createIndex({ "availability": 1 });

// Create admin user
db.users.insertOne({
    username: "admin",
    email: "admin@warranty.com",
    password: "$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password: password
    role: "admin",
    status: "active",
    note: "System Administrator",
    loginAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date()
});

print("Database initialized successfully!");
