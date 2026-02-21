export interface Contrato {
  id: number;
  capital: number;
  taxa: number;
  frequencia: string;
  status: string;
  garantia?: string;
  movimentacoes?: string[];
  
  lucroTotal?: number;
  multasPagas?: number;
  dataInicio?: string;
  proximoVencimento: string;
  valorMultaDiaria?: number;
  diasDiario?: number;
  
  totalParcelas?: number;
  parcelasPagas?: number;
  valorParcela?: number;
  lucroJurosPorParcela?: number;
}

export interface Cliente {
  id?: string; 
  nome: string;
  whatsapp: string;
  cpf?: string;
  endereco: string;
  indicacao: string;
  reputacao: string;
  segmento?: string;
  bloqueado?: boolean; // <--- ADICIONADO AQUI PARA O CADEADO
  contratos: Contrato[];
}

// --- NOVAS INTERFACES PARA O PDV / ESTOQUE ---

export interface Produto {
  id: number;
  nome: string;
  preco: number;
  estoque: number;
  codigo_barras?: string;
}

export interface Pedido {
  id: number;
  cliente_id?: string; // UUID ou null
  nome_cliente?: string; // <--- ADICIONADO: Para nome na Comanda
  status: string; // 'ABERTO', 'ATENDIDO', 'PAGO', 'CANCELADO'
  mesa_numero?: number;
  total: number;
  criado_em: string;
  forma_pagamento?: string; // <--- ADICIONADO: Para relatório (Dinheiro/Pix)
  itens?: ItemPedido[];
}

export interface ItemPedido {
  id: number;
  pedido_id: number;
  produto_id: number;
  quantidade: number;
  preco_unitario: number;
  produto?: Produto; // Para exibir o nome na lista
}