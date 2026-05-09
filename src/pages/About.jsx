'use client';

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ScrollExpandMedia from '@/components/ui/scroll-expansion-hero';
import Header from '@/components/Header';
import { scrollMainTo } from '@/utils/mainScroll';

const sampleMediaContent = {
  video: {
    src: 'https://www.youtube.com/watch?v=p9sz9FtGDcE&t=2807s',
    poster:
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=1280&auto=format&fit=crop',
    background:
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=1920&auto=format&fit=crop',
    title: 'Что такое SellYouBrick',
    date: 'Платформа недвижимости',
    scrollToExpand: 'Покупай и продавай вместе с нами',
    about: {
      overview:
        'Sellyourbrick — это современная платформа для покупки, продажи и аренды недвижимости. Мы объединяем продавцов и покупателей, предлагаем прозрачные аукционы, удобный поиск на карте и честные условия для всех участников. Наша цель — сделать сделки с недвижимостью простыми, быстрыми и безопасными.',
      conclusion:
        'Мы верим в технологии и человеческий подход: умный помощник в чате, бонусы и подписки, поддержка на каждом этапе. Выбирайте объекты на карте, участвуйте в аукционах, общайтесь с менеджерами в одном месте. Sellyourbrick — недвижимость без лишних барьеров.',
    },
  },
};

const MediaContent = () => {
  const currentMedia = sampleMediaContent.video;

  return (
    <div className="max-w-4xl mx-auto" id="about-intro">
      <h2 className="text-3xl font-bold mb-6 text-black dark:text-white">
        О нас
      </h2>
      <p className="text-lg mb-8 text-black dark:text-white">
        {currentMedia.about.overview}
      </p>
      <p className="text-lg mb-8 text-black dark:text-white">
        {currentMedia.about.conclusion}
      </p>
    </div>
  );
};

const ABOUT_HASH_TO_ID = {
  '#about-intro': 'about-intro',
};

const About = () => {
  const mediaType = 'video';
  const currentMedia = sampleMediaContent.video;
  const location = useLocation();

  useEffect(() => {
    scrollMainTo(0, 0);
    const resetEvent = new Event('resetSection');
    window.dispatchEvent(resetEvent);
  }, []);

  useEffect(() => {
    const id = ABOUT_HASH_TO_ID[location.hash];
    if (!id) return;
    const timer = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 450);
    return () => clearTimeout(timer);
  }, [location.pathname, location.hash]);

  return (
    <div className="min-h-screen">
      <Header />
      <ScrollExpandMedia
        mediaType={mediaType}
        mediaSrc={currentMedia.src}
        posterSrc={currentMedia.poster}
        bgImageSrc={currentMedia.background}
        title={currentMedia.title}
        date={currentMedia.date}
        scrollToExpand={currentMedia.scrollToExpand}
        textBlend
      >
        <MediaContent />
      </ScrollExpandMedia>
    </div>
  );
};

export default About;
