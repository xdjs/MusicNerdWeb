"use client"

import { Button } from "@/components/ui/button";
import { requestLogin } from "@/app/_components/nav/components/requestLogin";

export default function PleaseLoginPage({text = "Log in to access this page"}: {text?: string}) {
    function handleLogin() {
        requestLogin("please_login");
    }
    
    return (
        <section className="px-10 py-5 space-y-6 flex items-center justify-center flex-col">
            <h1 className="text-2xl text-center font-bold">{text}</h1>
            <Button className="bg-pastypink hover:bg-gray-200" onClick={handleLogin}>Log In</Button>
        </section>
    )
}