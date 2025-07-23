import * as z from "zod";

export const signUpSchema=z
.object({
        email: z
            .string()
            .min(1, {message: "Email is Required" })
            .email({message: "please enter a valid email" }),
        password: z
            .string()
            .min(1,{message:"password is required"})
            .min(8,{message:"passsword should minimum of 8 characters"}),
        passwordConfimation: z
            .string()
            .min(1, { message: "please confirm your password"}),
})

.refine((data) => data.password === data.passwordConfimation, {
    message: "Password do not match",
    path: ["passwordConfirmation"],
})
