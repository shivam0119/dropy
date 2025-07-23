import * as dotenv from "dotenv";


dotenv.config({path: ".env.local"});

if(!process.env.DATABASE_URL){
    throw new Error("Databse url is not set in .env.local");
}

export default ({
    schema: "./lib/db/schema.ts",
    out:"./drizzle",
    dialect: "postgresql",
    dbCredentials:{
        url:process.env.DATABASE_URL!,
    },
    migrations:{
        table:"__drizzle_migration",
        schema: "public"
    },
    verbose: true,
    strict:true,
    
});