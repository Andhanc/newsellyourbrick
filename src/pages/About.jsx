'use client';

import { useEffect } from 'react';
import ScrollExpandMedia from '@/components/ui/scroll-expansion-hero';
import { Timeline } from '@/components/ui/timeline';
import TeamShowcase from '@/components/ui/team-showcase';
import StartWithUs from '@/components/ui/StartWithUs';
import Header from '@/components/Header';
import { scrollMainTo } from '@/utils/mainScroll';

const sampleMediaContent = {
  video: {
    src: 'https://videos.pexels.com/video-files/3571097/3571097-sd_540_960_25fps.mp4',
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

const timelineData = [
  {
    title: '2024',
    content: (
      <div>
        <p className="text-neutral-800 dark:text-neutral-200 text-xs md:text-sm font-normal mb-8">
          Запуск аукционов недвижимости, карты объектов и подписок. Платформа объединила продавцов и покупателей в одном сервисе.
        </p>
        <div className="timeline-about__grid">
          <img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=600&auto=format&fit=crop" alt="Недвижимость" />
          <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=600&auto=format&fit=crop" alt="Дом" />
          <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600&auto=format&fit=crop" alt="Интерьер" />
          <img src="https://images.unsplash.com/photo-1600566753190-17f0baa2a6a3?q=80&w=600&auto=format&fit=crop" alt="Квартира" />
        </div>
      </div>
    ),
  },
  {
    title: '2023',
    content: (
      <div>
        <p className="text-neutral-800 dark:text-neutral-200 text-xs md:text-sm font-normal mb-8">
          Разработка идеи платформы и первых прототипов. Формирование команды и партнёрств с агентствами недвижимости.
        </p>
        <p className="text-neutral-800 dark:text-neutral-200 text-xs md:text-sm font-normal mb-8">
          Исследование рынка, проектирование аукционной модели и удобного поиска по карте для покупателей и продавцов.
        </p>
        <div className="timeline-about__grid">
          <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=600&auto=format&fit=crop" alt="Офис" />
          <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=600&auto=format&fit=crop" alt="Рабочее пространство" />
          <img src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=600&auto=format&fit=crop" alt="Команда" />
          <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=600&auto=format&fit=crop" alt="Сделка" />
        </div>
      </div>
    ),
  },
  {
    title: 'Сейчас',
    content: (
      <div>
        <p className="text-neutral-800 dark:text-neutral-200 text-xs md:text-sm font-normal mb-4">
          Активно развиваем платформу: новые функции и стабильная работа для тысяч пользователей.
        </p>
        <div className="timeline-about__list">
          <div className="timeline-about__list-item">✅ Аукционы недвижимости в реальном времени</div>
          <div className="timeline-about__list-item">✅ Поиск на карте и избранное</div>
          <div className="timeline-about__list-item">✅ Умный помощник в чате</div>
          <div className="timeline-about__list-item">✅ Бонусы и подписки для пользователей</div>
          <div className="timeline-about__list-item">✅ Безопасные сделки и поддержка</div>
        </div>
        <div className="timeline-about__grid">
          <img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=600&auto=format&fit=crop" alt="Объект" />
          <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=600&auto=format&fit=crop" alt="Недвижимость" />
          <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600&auto=format&fit=crop" alt="Квартира" />
          <img src="https://images.unsplash.com/photo-1600566753190-17f0baa2a6a3?q=80&w=600&auto=format&fit=crop" alt="Интерьер" />
        </div>
      </div>
    ),
  },
];

const MediaContent = () => {
  const currentMedia = sampleMediaContent.video;

  return (
    <div className="max-w-4xl mx-auto">
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

const About = () => {
  const mediaType = 'video';
  const currentMedia = sampleMediaContent.video;

  useEffect(() => {
    scrollMainTo(0, 0);
    const resetEvent = new Event('resetSection');
    window.dispatchEvent(resetEvent);
  }, []);

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
      <div className="w-full">
        <Timeline data={timelineData} />
      </div>
      <section className="team-section">
        <div className="team-section__inner">
          <h2 className="team-section__title">
            Наша команда
          </h2>
          <p className="team-section__subtitle">
            Люди, которые создают и развивают Sellyourbrick каждый день.
          </p>
          <TeamShowcase />
        </div>
      </section>
      <StartWithUs />
    </div>
  );
};

export default About;
