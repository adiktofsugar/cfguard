import { signal } from "@preact/signals";
import UserForm from "./UserForm";
import { UserTable } from "./UserTable";
import type { User } from "./interfaces";

const users = signal<User[] | null>(null);

interface UserGeneratorProps {
    isLocalR2: boolean;
    r2BucketName: string;
}

export function UserGenerator({ isLocalR2, r2BucketName }: UserGeneratorProps) {
    return (
        <div>
            <h2>Users</h2>
            <UserTable users={users} />
            <UserForm r2BucketName={r2BucketName} isLocalR2={isLocalR2} users={users} />
        </div>
    );
}