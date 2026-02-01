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