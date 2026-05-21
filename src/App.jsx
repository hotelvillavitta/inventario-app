import { useEffect, useState } from "react";

const API_URL =
  "https://script.google.com/macros/s/AKfycbzamD5CYg8ya6PaTuNFn4myR2-WINyKyIoW6NRt-jkkWU_hJJYwls6YfYaUsrfw30nk/exec";

export default function App() {

  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  async function cargarProductos() {

    const res = await fetch(
      `${API_URL}?action=productos`
    );

    const data = await res.json();

    setProductos(data);
  }

  useEffect(() => {
    cargarProductos();
  }, []);

  async function moverStock(producto, cambio) {

    const nota = prompt("Nota o comentario:");

    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "movimiento",
        producto_id: producto.id,
        producto: producto.nombre,
        cambio,
        nota,
        usuario: "Empleado"
      })
    });

    const resultado = await res.json();

    setProductos((prev) =>
      prev.map((p) => {

        if (p.id === producto.id) {

          return {
            ...p,
            stock_actual: resultado.nuevo_stock
          };
        }

        return p;
      })
    );
  }

  const filtrados = productos.filter((p) =>
    p.nombre
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  );

  return (
    <div style={{
      padding: 20,
      fontFamily: "Arial",
      background: "#f5f5f5",
      minHeight: "100vh"
    }}>

      <h1 style={{
        marginBottom: 20
      }}>
        Inventario
      </h1>

      <input
        type="text"
        placeholder="Buscar producto..."
        value={busqueda}
        onChange={(e) =>
          setBusqueda(e.target.value)
        }
        style={{
          width: "100%",
          padding: 12,
          marginBottom: 20,
          fontSize: 16,
          borderRadius: 10,
          border: "1px solid #ccc"
        }}
      />

      <div style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fill, minmax(250px, 1fr))",
        gap: 20
      }}>

        {filtrados.map((producto) => (

          <div
            key={producto.id}
            style={{
              background: "white",
              borderRadius: 15,
              padding: 15,
              boxShadow:
                "0 2px 10px rgba(0,0,0,0.1)"
            }}
          >

            <img
              src={producto.foto}
              alt={producto.nombre}
              style={{
                width: "100%",
                height: 180,
                objectFit: "cover",
                borderRadius: 10,
                marginBottom: 10
              }}
            />

            <h3>
              {producto.nombre}
            </h3>

            <p>
              <strong>
                Stock:
              </strong>
              {" "}
              {producto.stock_actual}
            </p>

            <p>
              {producto.unidad}
            </p>

            <div style={{
              display: "flex",
              gap: 10,
              marginTop: 10
            }}>

              <button
                onClick={() =>
                  moverStock(producto, 1)
                }
                style={{
                  flex: 1,
                  padding: 12,
                  fontSize: 20,
                  borderRadius: 10,
                  border: "none",
                  background: "#22c55e",
                  color: "white",
                  cursor: "pointer"
                }}
              >
                +
              </button>

              <button
                onClick={() =>
                  moverStock(producto, -1)
                }
                style={{
                  flex: 1,
                  padding: 12,
                  fontSize: 20,
                  borderRadius: 10,
                  border: "none",
                  background: "#ef4444",
                  color: "white",
                  cursor: "pointer"
                }}
              >
                -
              </button>

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}