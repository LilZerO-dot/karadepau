/*
  CATÁLOGO DA LOJA — edite aqui nomes, preços, descrições e fotos.
  - preco: em reais, use ponto para centavos (ex.: 189.90)
  - imagem: caminho da foto dentro da pasta "imagens"
  - estoque: quantidade disponível (0 = esgotado)
  - peso: em kg, usado no cálculo do frete
  Para adicionar uma peça nova, copie um bloco { ... } e mude o id.
*/
const PRODUTOS = [
  {
    id: "tabua-divisorias-resina",
    nome: "Tábua com Divisórias e Resina Dourada",
    categoria: "Madeira + Resina",
    preco: 289.90,
    imagem: "imagens/tabua-1.jpg",
    descricao: "Tábua de servir com divisórias entalhadas e veios de resina dourada. Ideal para frios e petiscos.",
    medidas: "45 x 25 cm (provisório)",
    estoque: 3,
    peso: 4 // kg, usado no frete (estimado)
  },
  {
    id: "tabua-resina-pedras-flores",
    nome: "Tábua Madeira e Resina com Pedras e Flores",
    categoria: "Madeira + Resina",
    preco: 349.90,
    imagem: "imagens/tabua-2.jpg",
    descricao: "Peça única com resina transparente, pedras e flores naturais encapsuladas.",
    medidas: "40 x 22 cm (provisório)",
    estoque: 1,
    peso: 4 // kg, usado no frete (estimado)
  },
  {
    id: "tabua-rustica-borda-natural",
    nome: "Tábua Rústica Escura de Borda Natural",
    categoria: "Rústica",
    preco: 199.90,
    imagem: "imagens/tabua-3.jpg",
    descricao: "Madeira escura com a borda natural do tronco preservada. Cada peça tem desenho próprio.",
    medidas: "50 x 28 cm (provisório)",
    estoque: 4,
    peso: 4 // kg, usado no frete (estimado)
  },
  {
    id: "tabua-churrasco-classica",
    nome: "Tábua de Churrasco Clássica",
    categoria: "Churrasco",
    preco: 159.90,
    imagem: "imagens/tabua-4.jpg",
    descricao: "Tábua robusta com canaleta para caldo. A parceira certa do churrasco de domingo.",
    medidas: "48 x 30 cm (provisório)",
    estoque: 6,
    peso: 4 // kg, usado no frete (estimado)
  }
];

// Configurações gerais da loja
const LOJA = {
  nome: "Kara de Pau",
  selo: "Madeira · Resina · Resgate · Reciclagem",
  whatsapp: "5500000000000", // troque pelo número com DDI+DDD, só dígitos
  // true enquanto o Mercado Pago não estiver ligado: mostra o aviso de loja em teste
  // e nenhum pedido é cobrado. Troque para false junto com MODO_SIMULADO em js/checkout.js.
  modoTeste: true
};
// O frete é configurado em js/frete.js
