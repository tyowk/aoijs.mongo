import { Model } from 'mongoose';
import type { AoiClient } from 'aoi.js';
export interface DatabaseOptions {
    url: string;
    tables?: string[] | string | (string | undefined)[];
}
export declare class Database {
    #private;
    client: AoiClient;
    constructor(client: AoiClient, options: DatabaseOptions);
    table(name: string): Model<any> | undefined;
    get tables(): string[];
    private connect;
    private makeKey;
    private prepare;
    private model;
    get(table: string, key: string, id?: string): Promise<{
        key: string;
        value: any;
    } | undefined>;
    set(table: string, key: string, id: string | undefined, value: any): Promise<boolean>;
}
