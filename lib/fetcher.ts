/**
 * SWR fetcher seguro — lança erro se a resposta não for ok (ex: 401, 500).
 * Isso garante que o SWR trate erros corretamente em vez de retornar
 * objetos de erro como dados válidos.
 */
export const fetcher = (url: string) =>
    fetch(url).then((res) => {
        if (!res.ok) throw new Error('API error: ' + res.status);
        return res.json();
    });
