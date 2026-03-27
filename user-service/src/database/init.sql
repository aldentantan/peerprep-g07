CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) unique not null,
    username VARCHAR(255) not null,
    hashed_password VARCHAR(255) not null,
    preferred_language VARCHAR(50) DEFAULT 'JavaScript',
    topics_of_interest TEXT[],
    access_role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

