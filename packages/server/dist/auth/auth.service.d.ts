export declare function registerUser(email: string, password: string): Promise<{
    user: {
        id: string;
        email: string;
    };
    token: string;
}>;
export declare function loginUser(email: string, password: string): Promise<{
    user: {
        id: string;
        email: string;
    };
    token: string;
}>;
