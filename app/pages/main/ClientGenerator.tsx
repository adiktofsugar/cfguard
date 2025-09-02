import { signal } from "@preact/signals";
import ClientsForm from "./ClientsForm";
import { ClientsTable } from "./ClientsTable";
import type { Client } from "./interfaces";

const clients = signal<Client[] | null>(null);
interface ClientGeneratorProps {
    isLocalR2: boolean;
    r2BucketName: string;
}

export function ClientGenerator({ isLocalR2, r2BucketName }: ClientGeneratorProps) {
    return (
        <div>
            <h2>Clients</h2>
            <ClientsTable clients={clients} />
            <ClientsForm r2BucketName={r2BucketName} isLocalR2={isLocalR2} clients={clients} />
        </div>
    );
}
