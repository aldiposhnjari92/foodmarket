import { useLanguage } from '@/contexts/language-context';
import { ShoppingBasket } from 'lucide-react';
import React from 'react'

const Logo = () => {

    const { t } = useLanguage();
  return (
    <>
        <ShoppingBasket className="size-5 text-primary" />
          <span className="text-lg font-bold">{t.appName}</span>
    </>
  )
}

export default Logo;