import Image from "next/image";
import { Leaf, Flame, Award, Heart } from "lucide-react";
export const metadata = { title: "Notre Histoire" };
export default function AboutPage() {
  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-16">
          <p className="text-[#C8973A] text-sm font-medium uppercase tracking-widest mb-3">Notre histoire</p>
          <h1 className="font-display text-5xl lg:text-6xl text-[#F5F0EB] mb-6 leading-tight">Une passion pour la cuisine créole</h1>
          <p className="text-[#9A8F84] text-lg leading-relaxed">Fondé au cœur de Saint-Denis, Spoon est né d'un amour profond pour les saveurs authentiques de La Réunion et d'une vision : élever la cuisine créole au rang de gastronomie.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-24">
          <div className="aspect-[4/3] relative rounded-2xl overflow-hidden">
            <Image src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80" alt="Cuisine Spoon" fill className="object-cover" />
          </div>
          <div>
            <h2 className="font-display text-3xl text-[#F5F0EB] mb-6">L'histoire de Spoon</h2>
            <p className="text-[#9A8F84] leading-relaxed mb-4">Tout a commencé dans la cuisine familiale, où les odeurs de curcuma, de gingembre et de piment oiseau se mêlaient au parfum de la vanille Bourbon. Ce patrimoine gustatif, nous avons voulu le partager avec le monde entier.</p>
            <p className="text-[#9A8F84] leading-relaxed mb-4">Chez Spoon, chaque plat est une invitation au voyage. Nous travaillons en étroite collaboration avec les producteurs locaux, les pêcheurs de l'île, les maraîchers des Hauts et les éleveurs du piémont pour vous offrir ce que l'île a de meilleur.</p>
            <p className="text-[#9A8F84] leading-relaxed">Notre chef, formé dans les plus grandes maisons, a fait le choix du retour aux sources — pour réinterpréter avec finesse les recettes de nos grands-mères.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
          {[
            { icon: Leaf, title: "Produits locaux", desc: "100% des ingrédients sourcés à La Réunion. Du marché du Chaudron à nos tables." },
            { icon: Flame, title: "Cuisine de tradition", desc: "Nos recettes transmises de génération en génération, sublimées par la technique moderne." },
            { icon: Award, title: "Excellence constante", desc: "Chaque assiette est pensée, dressée et servie avec le même soin depuis 15 ans." },
            { icon: Heart, title: "Accueil chaleureux", desc: "Chez Spoon, vous êtes reçu comme à la maison. La chaleur réunionnaise en prime." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-[#141414] border border-[#222] rounded-xl p-6">
              <div className="w-12 h-12 bg-[#C8973A]/10 border border-[#C8973A]/20 rounded-full flex items-center justify-center mb-4">
                <Icon size={22} className="text-[#C8973A]" />
              </div>
              <h3 className="font-display text-lg text-[#F5F0EB] mb-2">{title}</h3>
              <p className="text-sm text-[#9A8F84] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
