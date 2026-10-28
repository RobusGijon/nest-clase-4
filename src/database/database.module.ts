import { Module } from "@nestjs/common";
import { JsonDB } from "./json-db.js";
import { JsonRepository } from "../repository/json.repository.js";

@Module({
    providers: [JsonDB, JsonRepository],
    exports: [JsonRepository],
})
export class DatabaseModule {}