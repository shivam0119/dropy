import { NextResponse } from "next/server";
import {auth} from "@clerk/nextjs/server";
import ImageKit from "imagekit"

const imagekit=new ImageKit({
    
    publicKey:process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || "",
    privateKey:process.env.IMAGEKIT_PRIVATE_KEY || "",
    urlEndpoint:process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || ""
});

export async function GET(){
   try{
     const {userId}=await auth()
    if(!userId){
        return NextResponse.json({error:"Unathorized"},
            {status:401}
        )
    }
    const authParams = imagekit.getAuthenticationParameters()

    return NextResponse.json(authParams)
   }catch(error){
     console.error("Error fetching files:", error);
        return NextResponse.json({error: "Failed to generate authentication parameters for imagekit"},{status:500});
   }
}
