import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * ORM Converter: Raw SQL to Prisma
 * 
 * Original SQL:
 * SELECT * FROM users 
 * WHERE email LIKE '%@gmail.com' 
 * AND created_at > '2024-01-01'
 * ORDER BY created_at DESC;
 */

async function getRecentGmailUsers() {
    // Prisma Equivalent
    const users = await prisma.user.findMany({
        where: {
            email: {
                endsWith: '@gmail.com', // LIKE '%...'
            },
            createdAt: {
                gt: new Date('2024-01-01'), // > '2024-01-01'
            }
        },
        orderBy: {
            createdAt: 'desc', // ORDER BY ... DESC
        }
    });

    return users;
}

// SQLAlchemy Equivalent (Python) representation in comment:
/*
    session.query(User)
        .filter(User.email.like('%@gmail.com'))
        .filter(User.created_at > datetime(2024, 1, 1))
        .order_by(User.created_at.desc())
        .all()
*/
