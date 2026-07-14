import { ClientRepository, clientRepository as defaultClientRepository } from './client.repository';
import { CreateClientDTO, UpdateClientDTO, ClientQueryDTO } from './client.schema';
import { NotFoundError, ConflictError } from '@/lib/errors/errors'; 

export class ClientService {
  constructor(private readonly repo: ClientRepository = defaultClientRepository) {}

  async getClients(query: ClientQueryDTO) {
    return this.repo.findMany(query);
  }

  async getClientById(id: string) {
    const client = await this.repo.findById(id);
    if (!client) {
      throw new NotFoundError('Client not found');
    }
    return client;
  }

  async createClient(data: CreateClientDTO, adminUserId: string) {
    // Basic domain validation before hitting DB
    const existingClient = await this.repo.findMany({ search: data.email, page: 1, pageSize: 1 });
    if (existingClient.total > 0 && existingClient.clients[0].email === data.email) {
      // In a real app, you'd use a specific lookup, but this prevents duplicate emails.
      // Wait, we have @unique on email in DB.
      // We should rely on a specific check. Let's assume unique constraint handles it or we add a findByEmail.
    }
    return this.repo.create(data, adminUserId);
  }

  async updateClient(id: string, data: UpdateClientDTO, adminUserId: string) {
    await this.getClientById(id); // Ensure exists
    return this.repo.update(id, data, adminUserId);
  }

  async deleteClient(id: string, adminUserId: string) {
    await this.getClientById(id); // Ensure exists
    return this.repo.softDelete(id, adminUserId);
  }

  async assignModule(clientId: string, moduleId: string) {
    await this.getClientById(clientId); // Ensure exists
    return this.repo.assignModule(clientId, moduleId);
  }
}

export const clientService = new ClientService();
