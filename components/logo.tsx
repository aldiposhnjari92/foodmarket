"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/language-context";
import { getCurrentUser } from "@/lib/auth";
import Image from "next/image";
import Link from "next/link";

const Logo = ({ size = 32 }: { size?: number }) => {
  const { t } = useLanguage();
  const [href, setHref] = useState("/login");

  useEffect(() => {
    getCurrentUser().then((user) => {
      setHref(user ? "/dashboard" : "/login");
    });
  }, []);

  return (
    <Link href={href} className="flex items-center">
      <Image
        src={"/logo.svg"}
        width={size}
        height={size}
        alt="Food Market Logo"
        className="ml-2"
      />
      <h1 className="text-lg font-semibold">{t.appName}</h1>
    </Link>
  );
};

export default Logo;
