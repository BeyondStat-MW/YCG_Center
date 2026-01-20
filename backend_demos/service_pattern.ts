// --- Service / Repository Pattern Demo ---
// This pattern separates business logic (Service) from data access (Repository).
// It allows for easier testing, switching databases, and cleaner code.

// 1. Abstract Base Service (Generic CRUD)
abstract class BaseService<T> {
    abstract findAll(): Promise<T[]>;
    abstract findById(id: string): Promise<T | null>;
    abstract create(data: Omit<T, 'id'>): Promise<T>;
    abstract update(id: string, data: Partial<T>): Promise<T>;
    abstract delete(id: string): Promise<void>;
}

// 2. Interfaces (Domain Models)
interface User {
    id: string;
    name: string;
    email: string;
}

interface Product {
    id: string;
    name: string;
    price: number;
}

// 3. Concrete Implementations (Mocking DB calls)
class UserService extends BaseService<User> {
    async findAll(): Promise<User[]> {
        console.log("Fetching all users from DB...");
        return [{ id: '1', name: 'Alice', email: 'alice@example.com' }];
    }

    async findById(id: string): Promise<User | null> {
        console.log(`Fetching user ${id}...`);
        return { id, name: 'Alice', email: 'alice@example.com' };
    }

    async create(data: Omit<User, 'id'>): Promise<User> {
        console.log("Creating user...", data);
        return { id: 'new-id', ...data };
    }

    async update(id: string, data: Partial<User>): Promise<User> {
        console.log(`Updating user ${id}...`, data);
        return { id, name: 'Alice', email: 'alice@example.com', ...data };
    }

    async delete(id: string): Promise<void> {
        console.log(`Deleting user ${id}...`);
    }
}

class ProductService extends BaseService<Product> {
    // Product specific logic...
    async findAll(): Promise<Product[]> {
        return [];
    }
    async findById(id: string): Promise<Product | null> {
        return null;
    }
    async create(data: Omit<Product, 'id'>): Promise<Product> {
        return { id: '1', ...data };
    }
    async update(id: string, data: Partial<Product>): Promise<Product> {
        return { id, name: 'Updated', price: 100 };
    }
    async delete(id: string): Promise<void> { }

    async applyDiscount(id: string, percentage: number) {
        // Business logic specific to products
        const product = await this.findById(id);
        if (product) {
            const newPrice = product.price * (1 - percentage / 100);
            await this.update(id, { price: newPrice });
        }
    }
}

// Usage
export const userService = new UserService();
export const productService = new ProductService();
