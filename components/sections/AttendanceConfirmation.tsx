import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "../ui/button";
import {
  Phone,
  Heart,
  Sparkles,
  User,
  MessageCircle,
  Users,
  CheckCircle,
} from "lucide-react";
import { quinceMainData } from "@/components/sections/data/main-data";
import BackgroundCarrousel from "./BackgroundCarrousel";

/**
 * AttendanceFormContent - Componente de formulario de confirmación de asistencia
 * 
 * Características:
 * - Obtiene datos del invitado desde URL (?guest=ID) para limitar número de personas
 * - Genera opciones dinámicas en select basado en guestCount del invitado
 * - Pre-llena el nombre si viene en los datos del guest
 * - Envía confirmación por WhatsApp y registra en base de datos
 * - Maneja estados de carga y errores de forma transparente
 * 
 * @component
 */
const AttendanceFormContent = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);
  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    numeroInvitados: 1,
    confirmacion: "si", // 'si' o 'no'
    mensaje: "",
  });
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Estados para gestión de datos del invitado desde URL
  const [maxGuestCount, setMaxGuestCount] = useState<number | null>(null);
  const [guestData, setGuestData] = useState<any>(null);
  const [isLoadingGuest, setIsLoadingGuest] = useState(false);
  
  // Obtener parámetros de URL
  const searchParams = useSearchParams();

  const { attendance } = quinceMainData;

  // Número de WhatsApp de destino
  const whatsappNumber = attendance.whatsappNumber;

  // Función para obtener datos del invitado desde la API
  const fetchGuestData = async (guestId: string) => {
    setIsLoadingGuest(true);
    try {
      const response = await fetch(`/api/guests/${guestId}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.data) {
          const guest = data.data;
          setGuestData(guest);
          setMaxGuestCount(guest.guestCount || null);
          
          // Pre-llenar nombre si está disponible y el campo está vacío
          if (guest.name && !formData.nombre) {
            setFormData(prev => ({ ...prev, nombre: guest.name }));
          }
          
          console.log("✅ Datos del invitado cargados:", {
            name: guest.name,
            maxGuests: guest.guestCount
          });
        }
      } else {
        console.warn("⚠️ Guest no encontrado, usando valores por defecto");
      }
    } catch (error) {
      console.error("❌ Error al obtener datos del invitado:", error);
    } finally {
      setIsLoadingGuest(false);
    }
  };

  // Obtener datos del invitado si hay parámetro guest en URL
  useEffect(() => {
    const guestId = searchParams.get("guest");
    if (guestId) {
      fetchGuestData(guestId);
    }
  }, [searchParams]);

  // Ajustar número de invitados si excede el máximo permitido
  useEffect(() => {
    if (maxGuestCount && formData.numeroInvitados > maxGuestCount) {
      setFormData(prev => ({ 
        ...prev, 
        numeroInvitados: maxGuestCount 
      }));
      console.log(`⚠️ Número de invitados ajustado a ${maxGuestCount} (máximo permitido)`);
    }
  }, [maxGuestCount]);

  // IntersectionObserver para animaciones escalonadas
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          } else {
            setIsVisible(false);
          }
        });
      },
      {
        threshold: 0.3,
        rootMargin: '50px',
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  // Función simplificada - redirigir directamente (siempre funciona)
  const openWhatsAppDirectly = (whatsappUrl: string) => {
    // Redirección directa en la misma pestaña (sin pop-ups)
    window.location.href = whatsappUrl;
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "numeroInvitados" ? parseInt(value) || 1 : value,
    }));
  };

  const handleConfirmAttendance = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validación simple
    if (!formData.nombre.trim()) {
      alert("Por favor ingresa tu nombre");
      return;
    }

    // Procesar confirmación directamente (sin verificar pop-ups)
    await processConfirmation();
  };

  const processConfirmation = async () => {
    // Validación simple
    if (!formData.nombre.trim()) {
      alert("Por favor ingresa tu nombre");
      return;
    }

    setIsSubmitting(true);

    // Construir el mensaje de WhatsApp
    const confirmacionTexto =
      formData.confirmacion === "si"
        ? "✅ ¡Confirmo mi asistencia!"
        : "❌ No podré asistir";

    const invitadosTexto =
      formData.numeroInvitados === 1
        ? "1 persona"
        : `${formData.numeroInvitados} personas`;

    const mensaje = `🎉 *CONFIRMACIÓN DE ASISTENCIA* 🎉

👤 *Nombre:* ${formData.nombre}
${formData.telefono ? `📱 *Teléfono:* ${formData.telefono}` : ""}

${confirmacionTexto}
👥 *Número de invitados:* ${invitadosTexto}

${formData.mensaje ? `💌 *Mensaje especial:*\n${formData.mensaje}` : ""}

¡Gracias por responder! 💖✨`;

    console.log("📝 Mensaje WhatsApp construido:", mensaje);

    // Codificar el mensaje para URL
    const mensajeCodificado = encodeURIComponent(mensaje);

    // Crear URL de WhatsApp
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${mensajeCodificado}`;

    try {
      // 🎯 NUEVA FUNCIONALIDAD: Llamar al endpoint de confirmación automática
      const confirmationData = {
        name: formData.nombre.trim(),
        numberOfGuests: formData.numeroInvitados,
        willAttend: formData.confirmacion === "si",
        comments: formData.mensaje?.trim() || undefined,
        phone: formData.telefono?.trim() || undefined,
      };

      console.log("🎯 Enviando confirmación automática...", confirmationData);

      const response = await fetch("/api/guests/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(confirmationData),
      });

      const result = await response.json();

      if (result.success) {
        // Log transparente para debugging (como especificado)
        console.log("🎯 Confirmación procesada exitosamente:", {
          action: result.action,
          guest: result.guest.name,
          similarity: result.matchInfo?.similarity,
          matchType: result.matchInfo?.matchType,
          willAttend: confirmationData.willAttend,
          numberOfGuests: confirmationData.numberOfGuests,
        });

        if (result.action === "updated") {
          const matchMethod =
            result.matchInfo?.matchMethod === "phone" ? "teléfono" : "nombre";
          const conflictInfo = result.matchInfo?.hasConflict
            ? " (⚠️ números diferentes)"
            : "";
          console.log(
            `✅ Invitado actualizado por ${matchMethod}: "${
              result.guest.name
            }" (${result.matchInfo?.similarity?.toFixed(
              1
            )}% similitud)${conflictInfo}`
          );

          if (result.matchInfo?.hasConflict) {
            console.log(
              `⚠️ Se detectó un conflicto de teléfono - verificar manualmente`
            );
          }
        } else if (result.action === "created") {
          console.log(`🆕 Nuevo invitado creado: "${result.guest.name}"`);
          if (result.matchInfo?.multipleMatches) {
            console.log(
              `⚠️ Búsqueda ambigua: ${result.matchInfo.matchesCount} coincidencias similares encontradas`
            );
          }
        }
      } else {
        console.error("❌ Error en confirmación automática:", result.message);
      }
    } catch (error) {
      console.error("❌ Error procesando confirmación automática:", error);
      // No mostrar error al usuario - mantener transparencia como especificado
    }

    // Simular delay de envío y redirigir a WhatsApp (funcionalidad simplificada)
    setTimeout(() => {
      console.log("📱 Redirigiendo a WhatsApp...", whatsappUrl);

      // Redirección directa (siempre funciona, sin problemas de pop-ups)
      openWhatsAppDirectly(whatsappUrl);

      // Mostrar mensaje de éxito antes de redireccionar
      setShowSuccess(true);
      setIsSubmitting(false);

    }, 1500);
  };

  return (
    <section
      ref={sectionRef}
      style={{
        /* background: "url('/images/fondoAzul2.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat", */
        //backgroundColor: "#fff",
      }}
      className="relative py-20 px-4"
    >

      {/* <BackgroundCarrousel images={attendance.images} /> */}

        {/* Partículas flotantes de confeti 
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute welcome-float-particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${i * 1000}ms`,
                fontSize: `${12 + Math.random() * 8}px`,
                color: 'rgba(255, 255, 255, 0.6)'
              }}
            >
              💌
            </div>
          ))}
        </div>
        */}

      <div className="max-w-2xl mx-auto relative rounded-3xl">
        <div
          className="rounded-3xl p-10 shadow-2xl border-2 relative overflow-hidden"
          
        >
          {/* Shimmer effect decorativo */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-aurora-oro to-transparent animate-vip-shimmer-aurora opacity-60"></div>

          {/* Header con icono y título */}
          <div className="text-center mb-8">
            <div
              className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 shadow-lg transition-all duration-1000 ${
                isVisible 
                  ? 'opacity-100 scale-100 animate-vip-pulse-aurora' 
                  : 'opacity-0 scale-50'
              }`}
              style={{
                background:
                  "linear-gradient(135deg, var(--color-aurora-rosa), var(--color-aurora-lavanda))",
                transitionDelay: '0ms'
              }}
            >
              <Heart className="w-10 h-10 text-pink-600" />
            </div>

            <h3
              className={`text-4xl font-main-text font-bold mb-4 leading-tight text-sky-700 transition-all duration-1000 delay-1000 ${
                isVisible 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-0 -translate-y-8'
              }`}
              style={{
                background:
                  "linear-gradient(135deg, var(--color-aurora-lavanda), var(--color-aurora-rosa))",
                WebkitBackgroundClip: "text",
                //WebkitTextFillColor: "transparent", 💌
                backgroundClip: "text",
              }}
            >
               Confirma tu Asistencia
            </h3>

            <p
              className={`text-xl text-amber-900 bg-slate-300 bg-opacity-60 rounded-2xl p-6 leading-relaxed max-w-lg mx-auto transition-all duration-1000 delay-1000 ${
                isVisible 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-0 -translate-y-8'
              }`}
            
            >
              ¿Nos acompañarás en este día tan especial?
              <br />
              <span className="font-medium">
                Confirma tu asistencia y comparte este momento único
              </span>
            </p>
          </div>

          {/* Formulario mejorado */}
          <form onSubmit={handleConfirmAttendance} className="space-y-6">
            {/* Indicador de carga de datos del invitado */}
            {isLoadingGuest && (
              <div className="text-center p-4 rounded-2xl mb-6 bg-blue-50 border border-blue-200">
                <div className="flex items-center justify-center space-x-2 text-blue-600">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <p className="text-sm font-medium">Cargando datos de tu invitación...</p>
                </div>
              </div>
            )}

            {/* Mensaje de éxito */}
            {showSuccess && (
              <div
                className="text-center p-4 rounded-2xl mb-6 animate-pulse"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255, 179, 217, 0.2), rgba(230, 217, 255, 0.2))",
                  border: "2px solid var(--color-aurora-rosa)",
                }}
              >
                <div className="text-2xl mb-2">✅ ¡Confirmación Enviada!</div>
                <p style={{ color: "var(--color-aurora-lavanda)" }}>
                  WhatsApp se abrirá automáticamente con tu mensaje de
                  confirmación
                </p>
              </div>
            )}

            {/* Campo Nombre */}
            <div className={`relative group transition-all duration-1000 delay-2000 ${
              isVisible 
                ? 'opacity-100 translate-x-0' 
                : 'opacity-0 -translate-x-12'
            }`}>
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-aurora-lavanda opacity-70" />
              </div>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                placeholder="Tu nombre completo"
                required
                disabled={isSubmitting || isLoadingGuest}
                className="w-full text-black pl-12 pr-4 py-4 rounded-2xl border-2 transition-all duration-3000 focus:outline-none focus:ring-0 text-lg placeholder-opacity-60 disabled:opacity-50"
                style={{
                  background: "rgba(253, 252, 252, 0.8)",
                  borderColor: "rgba(255, 242, 204, 0.4)",
                  //color: "var(--color-aurora-lavanda)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--color-aurora-rosa)";
                  e.target.style.boxShadow =
                    "0 0 20px rgba(255, 179, 217, 0.3)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255, 242, 204, 0.4)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Campo Teléfono */}
            <div className={`relative group transition-all duration-1000 delay-3000 ${
              isVisible 
                ? 'opacity-100 translate-x-0' 
                : 'opacity-0 translate-x-12'
            }`}>
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-aurora-lavanda opacity-70" />
              </div>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleInputChange}
                placeholder="Tu número de teléfono"
                disabled={isSubmitting || isLoadingGuest}
                className="w-full text-black pl-12 pr-4 py-4 rounded-2xl border-2 transition-all duration-3000 focus:outline-none focus:ring-0 text-lg placeholder-opacity-60 disabled:opacity-50"
                style={{
                  background: "rgba(253, 252, 252, 0.8)",
                  borderColor: "rgba(255, 242, 204, 0.4)",
                  //color: "var(--color-aurora-lavanda)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--color-aurora-rosa)";
                  e.target.style.boxShadow =
                    "0 0 20px rgba(255, 179, 217, 0.3)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255, 242, 204, 0.4)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Campo Confirmación de Asistencia */}
            <div className={`relative group transition-all duration-1000 delay-4000 ${
              isVisible 
                ? 'opacity-100 translate-x-0' 
                : 'opacity-0 -translate-x-12'
            }`}>
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <CheckCircle className="h-5 w-5 text-aurora-lavanda opacity-70" />
              </div>
              <select
                name="confirmacion"
                value={formData.confirmacion}
                onChange={handleInputChange}
                disabled={isSubmitting || isLoadingGuest}
                className="w-full text-black pl-12 pr-4 py-4 rounded-2xl border-2 transition-all duration-3000 focus:outline-none focus:ring-0 text-lg disabled:opacity-50 appearance-none cursor-pointer"
                style={{
                  background: "rgba(253, 252, 252, 0.8)",
                  borderColor: "rgba(255, 242, 204, 0.4)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--color-aurora-rosa)";
                  e.target.style.boxShadow =
                    "0 0 20px rgba(255, 179, 217, 0.3)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255, 242, 204, 0.4)";
                  e.target.style.boxShadow = "none";
                }}
              >
                <option value="si">✅ Sí, confirmo mi asistencia</option>
                <option value="no">❌ No podré asistir</option>
              </select>
            </div>

            {/* Campo Número de Invitados */}
            <div className={`relative group transition-all duration-1000 delay-5000 ${
              isVisible 
                ? 'opacity-100 translate-x-0' 
                : 'opacity-0 translate-x-12'
            }`}>
              <div className="relative top-10 left-5 flex items-center pointer-events-none z-10">
                <Users className="h-5 w-5 text-aurora-lavanda opacity-70" />
              </div>
              <select
                name="numeroInvitados"
                value={formData.numeroInvitados}
                onChange={handleInputChange}
                disabled={isSubmitting || isLoadingGuest}
                className="w-full text-black pl-12 pr-4 py-4 rounded-2xl border-2 transition-all duration-3000 focus:outline-none focus:ring-0 text-lg disabled:opacity-50 appearance-none cursor-pointer"
                style={{
                  background: "rgba(253, 252, 252, 0.8)",
                  borderColor: "rgba(255, 242, 204, 0.4)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--color-aurora-rosa)";
                  e.target.style.boxShadow =
                    "0 0 20px rgba(255, 179, 217, 0.3)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255, 242, 204, 0.4)";
                  e.target.style.boxShadow = "none";
                }}
              >
                {Array.from(
                  { length: maxGuestCount || 10 }, 
                  (_, i) => i + 1
                ).map((num) => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? 'persona' : 'personas'}
                  </option>
                ))}
              </select>
              
              {/* Mensaje informativo sobre el límite */}
              {maxGuestCount && maxGuestCount < 10 && (
                <p className="text-sm text-blue-600 mt-2 text-center bg-blue-50 py-2 px-4 rounded-xl border border-blue-200">
                  💡 Tu invitación es para máximo <span className="font-semibold">{maxGuestCount}</span> {maxGuestCount === 1 ? 'persona' : 'personas'}
                </p>
              )}
            </div>

            {/* Campo Mensaje */}
            <div className={`relative group transition-all duration-1000 delay-6000 ${
              isVisible 
                ? 'opacity-100 translate-x-0' 
                : 'opacity-0 -translate-x-12'
            }`}>
              <div className="absolute top-4 left-0 pl-4 flex items-start pointer-events-none">
                <MessageCircle className="h-5 w-5 text-aurora-lavanda opacity-70" />
              </div>
              <textarea
                name="mensaje"
                value={formData.mensaje}
                onChange={handleInputChange}
                placeholder="Mensaje especial (opcional)..."
                rows={4}
                disabled={isSubmitting || isLoadingGuest}
                className="w-full text-black pl-12 pr-4 py-4 rounded-2xl border-2 transition-all duration-3000 focus:outline-none focus:ring-0 text-lg placeholder-opacity-60 resize-none disabled:opacity-50"
                style={{
                  background: "rgba(253, 252, 252, 0.8)",
                  borderColor: "rgba(255, 242, 204, 0.4)",
                  //color: "var(--color-aurora-lavanda)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--color-aurora-rosa)";
                  e.target.style.boxShadow =
                    "0 0 20px rgba(255, 179, 217, 0.3)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255, 242, 204, 0.4)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Botón de confirmación mejorado */}
            <div className={`pt-4 text-center transition-all duration-1000 delay-7000 ${
              isVisible 
                ? 'opacity-100 scale-100' 
                : 'opacity-0 scale-75'
            }`}>
              <Button
                size="lg"
                type="submit"
                disabled={isSubmitting || showSuccess || isLoadingGuest}
                className="relative overflow-hidden text-white rounded-full py-8 px-8 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-500 text-lg font-semibold group min-w-[200px] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                style={{
                  background: showSuccess
                    ? "linear-gradient(135deg, #4ade80, #22c55e, #16a34a)"
                    : "linear-gradient(135deg, #aaa 0%, #bbb 50%, #ccc 100%)",
                  border: "2px solid rgba(255, 242, 204, 0.5)",
                }}
              >
                {/* Efecto shimmer en el botón */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transform -skew-x-12 group-hover:translate-x-full transition-all duration-3000"></div>

                <div className="relative flex items-center justify-center">
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Preparando mensaje...
                    </>
                  ) : showSuccess ? (
                    <>
                      <span className="text-2xl mr-2">✅</span>
                      <span>¡Enviado a WhatsApp!</span>
                    </>
                  ) : (
                    <>
                      <Phone className="w-5 h-5 mr-3 group-hover:animate-bounce" />
                      <h6 className="text-purple-700 flex flex-col md:flex-row gap-2 items-center justify-center">
                        <span>Confirmar</span>
                        <span>Asistencia</span>
                      </h6>
                    </>
                  )}
                </div>
              </Button>

              {/* Texto informativo debajo del botón */}
              <p className={`mt-4 text-sm opacity-75 text-pink-500 bg-emerald-200 bg-opacity-50 p-4 rounded-xl transition-all duration-1000 delay-8000 ${
                isVisible 
                  ? 'opacity-75 translate-y-0' 
                  : 'opacity-0 translate-y-8'
              }`}>
                {showSuccess
                  ? "¡Gracias por confirmar! Te esperamos en esta celebración especial 🎉"
                  : "Al confirmar, recibirás todos los detalles por WhatsApp 💌"}
              </p>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

// Componente de loading/fallback para Suspense
function AttendanceLoading() {
  return (
    <section className="relative py-20 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-3xl p-10 shadow-2xl border-2 bg-white/80 relative overflow-hidden">
          {/* Shimmer effect decorativo */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-aurora-oro to-transparent animate-vip-shimmer-aurora opacity-60"></div>
          
          <div className="text-center">
            <div className="animate-pulse space-y-6">
              {/* Icono */}
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mx-auto shadow-lg"
                style={{
                  background: "linear-gradient(135deg, var(--color-aurora-rosa), var(--color-aurora-lavanda))",
                }}>
                <Heart className="w-10 h-10 text-pink-600 opacity-50" />
              </div>
              
              {/* Título */}
              <div className="h-10 bg-gradient-to-r from-blue-200 to-purple-200 rounded-xl w-3/4 mx-auto"></div>
              
              {/* Descripción */}
              <div className="h-6 bg-gray-200 rounded-lg w-full"></div>
              <div className="h-6 bg-gray-200 rounded-lg w-5/6 mx-auto"></div>
              
              {/* Campos de formulario simulados */}
              <div className="space-y-4 mt-8">
                <div className="h-14 bg-gray-100 rounded-2xl w-full"></div>
                <div className="h-14 bg-gray-100 rounded-2xl w-full"></div>
                <div className="h-14 bg-gray-100 rounded-2xl w-full"></div>
              </div>
            </div>
            
            {/* Indicador de carga */}
            <div className="mt-8 flex items-center justify-center space-x-2 text-blue-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-sm font-medium">Cargando formulario...</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Componente principal exportado con Suspense
export default function AttendanceConfirmation() {
  return (
    <Suspense fallback={<AttendanceLoading />}>
      <AttendanceFormContent />
    </Suspense>
  );
}
