import React, {useState, useEffect} from "react";
//import { quinceMainData } from "@/components/sections/data/main-data";

// Lista de imágenes para el carrusel
//const images = quinceMainData.hero.backgroundCarrouselImages;
/* const images = [
  "/images/zoeMerari1.jpg",
  "/images/zoeMerari2.jpg",
  "/images/zoeMerari3.jpg",
  "/images/zoeMerari4.jpg",
  "/images/zoeMerari5.jpg",
  "/images/zoeMerari6.jpg",
]; */

const BackgroundCarrousel = ({images}) => {
    // Estado del carrusel
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Auto-avance del carrusel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length)
    }, 2000)

    return () => clearInterval(timer)
  }, [])

  return (
    <div>
      {/* Carrusel de imágenes de fondo */}
      {images.map((image, index) => (
        <div
          key={image}
          className={`absolute inset-0 transition-opacity duration-500 ${
            index === currentImageIndex
              ? `opacity-${isTransitioning ? "50" : "100"}`
              : "opacity-0"
          }`}
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('${image}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      ))}
    </div>
  );
};

export default BackgroundCarrousel;
