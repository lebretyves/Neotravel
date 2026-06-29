"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import styles from "../app/home.module.css";

const slides = [
  {
    title: "Voyages hiver",
    subtitle: "Autocar en conditions montagne",
    image: "/images/landing-carousel/car-neige-premium.webp"
  },
  {
    title: "Routes panoramiques",
    subtitle: "Trajets longue distance",
    image: "/images/landing-carousel/car-route-cotiere.webp"
  },
  {
    title: "Transport premium",
    subtitle: "Autocar grand tourisme",
    image: "/images/landing-carousel/car-montagne-premium.webp"
  },
  {
    title: "Sorties et loisirs",
    subtitle: "Groupes, parcs et séjours",
    image: "/images/landing-carousel/car-paris-disney.webp"
  },
  {
    title: "Confort a bord",
    subtitle: "Intérieur autocar premium",
    image: "/images/landing-carousel/bus-interieur-premium.webp"
  }
];

export function HomeCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 10000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className={styles.carouselBlock} aria-label="Carousel NeoTravel">
      <div className={styles.carouselBackground} aria-hidden="true">
        {slides.map((slide, index) => (
          <Image
            key={slide.title}
            src={slide.image}
            alt=""
            fill
            sizes="100vw"
            priority={index === 0}
            className={index === activeIndex ? styles.carouselImageActive : styles.carouselImage}
          />
        ))}
      </div>

      <div className={styles.carouselOverlay} />

      <div className={styles.carouselMeta} aria-live="polite">
        <div className={styles.carouselDots} aria-hidden="true">
          {slides.map((slide, index) => (
            <span key={slide.title} className={index === activeIndex ? styles.activeDot : styles.dot} />
          ))}
        </div>
      </div>
    </div>
  );
}
