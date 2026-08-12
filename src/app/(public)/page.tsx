import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { ChevronRight, Star, MapPin, Clock, Phone, Leaf, Flame, Award } from "lucide-react";
import { formatPrice } from "@/lib/utils";

async function getFeaturedDishes() {
  return prisma.dish.findMany({
    where: { isDailySpecial: true, isAvailable: true },
    include: { category: true },
    take: 3,
  });
}

export default async function HomePage() {
  const featuredDishes = await getFeaturedDishes();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/30 via-[#0A0A0A]/50 to-[#0A0A0A] z-10" />
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1800&q=80')" }}
        />
        <div className="relative z-20 text-center px-4 max-w-4xl mx-auto">
          <p className="text-[#C8973A] text-sm font-medium uppercase tracking-[0.3em] mb-6">Restaurant Créole · Saint-Denis, La Réunion</p>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-8xl font-light text-[#F5F0EB] leading-tight mb-6">
            L&apos;art de la cuisine<br />
            <span className="text-gradient-gold italic">créole</span>
          </h1>
          <p className="text-[#9A8F84] text-lg sm:text-xl max-w-xl mx-auto mb-10 leading-relaxed">
            Des saveurs authentiques de l&apos;île, une expérience gastronomique inoubliable au cœur de Saint-Denis.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/reservation"
              className="bg-[#C8973A] hover:bg-[#E8B04A] text-[#0A0A0A] font-semibold px-8 py-4 rounded-lg transition-colors text-base"
            >
              Réserver une table
            </Link>
            <Link
              href="/menu"
              className="flex items-center gap-2 text-[#F5F0EB] hover:text-[#C8973A] font-medium transition-colors text-base"
            >
              Découvrir la carte <ChevronRight size={18} />
            </Link>
          </div>
        </div>
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 animate-bounce">
          <div className="w-0.5 h-12 bg-gradient-to-b from-[#C8973A] to-transparent mx-auto" />
        </div>
      </section>

      {/* Info bar */}
      <section className="bg-[#141414] border-y border-[#222]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-0 sm:divide-x sm:divide-[#222]">
            {[
              { icon: MapPin, text: "12 Rue de Paris, Saint-Denis" },
              { icon: Clock, text: "Lun – Sam · 12h–14h & 19h–21h" },
              { icon: Phone, text: "+262 692 00 00 00" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 px-4 first:pl-0 last:pr-0">
                <Icon size={18} className="text-[#C8973A] shrink-0" />
                <span className="text-sm text-[#9A8F84]">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-[#C8973A] text-sm font-medium uppercase tracking-widest mb-4">Notre histoire</p>
            <h2 className="font-display text-4xl lg:text-5xl text-[#F5F0EB] mb-6 leading-tight">
              Une table au cœur<br />de l&apos;authenticité
            </h2>
            <p className="text-[#9A8F84] leading-relaxed mb-4">
              Spoon est né d&apos;une passion profonde pour la cuisine créole réunionnaise. Ici, chaque plat raconte l&apos;histoire de l&apos;île : ses épices, ses saveurs métissées, sa générosité.
            </p>
            <p className="text-[#9A8F84] leading-relaxed mb-8">
              Nos produits viennent directement des marchés locaux et des producteurs de l&apos;île. Du curcuma des Hauts à la vanille Bourbon, nous sublimos le terroir réunionnais avec une cuisine contemporaine et raffinée.
            </p>
            <div className="flex items-center gap-8 mb-8">
              {[
                { value: "15+", label: "Années d'expérience" },
                { value: "100%", label: "Produits locaux" },
                { value: "4.9", label: "Note Google" },
              ].map(({ value, label }) => (
                <div key={label}>
                  <p className="font-display text-3xl text-[#C8973A] font-semibold">{value}</p>
                  <p className="text-xs text-[#5A5249] mt-1">{label}</p>
                </div>
              ))}
            </div>
            <Link href="/about" className="inline-flex items-center gap-2 text-[#C8973A] hover:text-[#E8B04A] font-medium transition-colors">
              En savoir plus <ChevronRight size={18} />
            </Link>
          </div>
          <div className="relative">
            <div className="aspect-[4/5] rounded-2xl overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800&q=80"
                alt="Cuisine Spoon"
                fill
                className="object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-[#141414] border border-[#222] rounded-xl p-5 shadow-xl">
              <div className="flex items-center gap-2 mb-2">
                {[1,2,3,4,5].map(i => <Star key={i} size={14} className="fill-[#C8973A] text-[#C8973A]" />)}
              </div>
              <p className="text-sm text-[#F5F0EB] font-medium">"Une expérience unique"</p>
              <p className="text-xs text-[#5A5249] mt-1">— Marie L., cliente fidèle</p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-[#141414] border-y border-[#222]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { icon: Leaf, title: "Produits locaux", desc: "100% des ingrédients proviennent des producteurs et marchés de La Réunion." },
              { icon: Flame, title: "Cuisine de tradition", desc: "Nos recettes transmises depuis des générations, réinterprétées avec créativité." },
              { icon: Award, title: "Excellence constante", desc: "Un soin particulier porté à chaque assiette, chaque service, chaque détail." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex flex-col items-center text-center p-8">
                <div className="w-14 h-14 bg-[#C8973A]/10 border border-[#C8973A]/20 rounded-full flex items-center justify-center mb-5">
                  <Icon size={24} className="text-[#C8973A]" />
                </div>
                <h3 className="font-display text-xl text-[#F5F0EB] mb-3">{title}</h3>
                <p className="text-sm text-[#9A8F84] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured dishes */}
      {featuredDishes.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-[#C8973A] text-sm font-medium uppercase tracking-widest mb-3">À la une</p>
              <h2 className="font-display text-4xl text-[#F5F0EB]">Nos suggestions du moment</h2>
            </div>
            <Link href="/menu" className="hidden sm:flex items-center gap-2 text-[#9A8F84] hover:text-[#C8973A] text-sm transition-colors">
              Voir toute la carte <ChevronRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredDishes.map((dish) => (
              <div key={dish.id} className="group bg-[#141414] border border-[#222] rounded-xl overflow-hidden hover:border-[#C8973A]/30 transition-all hover:shadow-lg hover:shadow-[#C8973A]/5">
                <div className="aspect-[4/3] relative overflow-hidden bg-[#222]">
                  {dish.imageUrl ? (
                    <Image src={dish.imageUrl} alt={dish.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[#5A5249]">
                      <Flame size={48} />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className="bg-[#C8973A] text-[#0A0A0A] text-xs font-semibold px-2.5 py-1 rounded-full">Suggestion du chef</span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-display text-lg text-[#F5F0EB] font-semibold leading-tight">{dish.name}</h3>
                    <span className="text-[#C8973A] font-semibold text-sm shrink-0">{formatPrice(dish.price)}</span>
                  </div>
                  <p className="text-sm text-[#9A8F84] leading-relaxed line-clamp-2">{dish.description}</p>
                  <p className="text-xs text-[#5A5249] mt-3">{dish.category.name}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="sm:hidden text-center mt-8">
            <Link href="/menu" className="inline-flex items-center gap-2 text-[#C8973A] hover:text-[#E8B04A] font-medium">
              Voir toute la carte <ChevronRight size={16} />
            </Link>
          </div>
        </section>
      )}

      {/* CTA Reservation */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[#C8973A]/5 border-y border-[#C8973A]/20" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <h2 className="font-display text-4xl lg:text-5xl text-[#F5F0EB] mb-4">
            Réservez votre table
          </h2>
          <p className="text-[#9A8F84] text-lg mb-10 max-w-xl mx-auto">
            En ligne en moins de 2 minutes. Confirmation immédiate par email.
          </p>
          <Link
            href="/reservation"
            className="inline-flex items-center gap-2 bg-[#C8973A] hover:bg-[#E8B04A] text-[#0A0A0A] font-semibold px-10 py-4 rounded-lg transition-colors text-base"
          >
            Réserver maintenant <ChevronRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
