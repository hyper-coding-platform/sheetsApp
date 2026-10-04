"use client";

import { FormEvent, useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
};

const API_URL =
  "https://script.google.com/macros/s/AKfycbzdjplU0380DW2dRX6mdjTAcgX9fOeAAd0nol31da1TZtZp8Vng45gM7zgzjG2gw0VC6w/exec";

const SHEET_NAME = "products";

export default function Page() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    price: "",
    stock: "",
  });

  // ----------------------------------------
  // GET PRODUCTS
  // ----------------------------------------

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}?sheet=${encodeURIComponent(SHEET_NAME)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load products");
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error(data?.error || "Invalid response");
      }

      const normalized: Product[] = data.map((item) => ({
        id: String(item.id ?? ""),
        name: String(item.name ?? ""),
        price: Number(item.price ?? 0),
        stock: Number(item.stock ?? 0),
      }));

      setProducts(normalized);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------------------
  // LOAD ON PAGE OPEN
  // ----------------------------------------

  useEffect(() => {
    loadProducts();
  }, []);

  // ----------------------------------------
  // FORM INPUT
  // ----------------------------------------

  function updateForm(
    field: keyof typeof form,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  // ----------------------------------------
  // CREATE PRODUCT
  // ----------------------------------------

  async function createProduct(event: FormEvent) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Product name is required");
      return;
    }

    const price = Number(form.price);
    const stock = Number(form.stock);

    if (Number.isNaN(price) || price < 0) {
      setError("Enter a valid price");
      return;
    }

    if (Number.isNaN(stock) || stock < 0) {
      setError("Enter a valid stock quantity");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const product: Product = {
        id: generateId(),
        name: form.name.trim(),
        price,
        stock,
      };

      const response = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({
          sheet: SHEET_NAME,
          data: product,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save product");
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(
          result.error || "Failed to save product"
        );
      }

      // Reset form
      setForm({
        name: "",
        price: "",
        stock: "",
      });

      // Reload from Google Sheet
      await loadProducts();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setSaving(false);
    }
  }

  // ----------------------------------------
  // GENERATE ID
  // ----------------------------------------

  function generateId() {
    return `P-${Date.now()}`;
  }

  // ----------------------------------------
  // DELETE
  //
  // Not implemented because the basic
  // Apps Script example does not expose
  // DELETE yet.
  // ----------------------------------------

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f5f7",
        padding: "40px 20px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        {/* HEADER */}

        <div style={{ marginBottom: 32 }}>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 700,
              margin: 0,
              color: "#111",
            }}
          >
            Products
          </h1>

          <p
            style={{
              marginTop: 8,
              color: "#666",
            }}
          >
            Google Sheets database
          </p>
        </div>

        {/* ERROR */}

        {error && (
          <div
            style={{
              background: "#fff1f0",
              border: "1px solid #ffccc7",
              color: "#cf1322",
              padding: "12px 16px",
              borderRadius: 10,
              marginBottom: 20,
            }}
          >
            {error}
          </div>
        )}

        {/* ADD PRODUCT */}

        <section
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: 24,
            marginBottom: 24,
            boxShadow:
              "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: 20,
              fontSize: 20,
            }}
          >
            Add Product
          </h2>

          <form onSubmit={createProduct}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "2fr 1fr 1fr auto",
                gap: 12,
                alignItems: "end",
              }}
            >
              {/* NAME */}

              <label>
                <div
                  style={{
                    fontSize: 13,
                    color: "#666",
                    marginBottom: 6,
                  }}
                >
                  Product name
                </div>

                <input
                  value={form.name}
                  onChange={(e) =>
                    updateForm("name", e.target.value)
                  }
                  placeholder="T-Shirt"
                  style={inputStyle}
                />
              </label>

              {/* PRICE */}

              <label>
                <div
                  style={{
                    fontSize: 13,
                    color: "#666",
                    marginBottom: 6,
                  }}
                >
                  Price
                </div>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) =>
                    updateForm("price", e.target.value)
                  }
                  placeholder="599"
                  style={inputStyle}
                />
              </label>

              {/* STOCK */}

              <label>
                <div
                  style={{
                    fontSize: 13,
                    color: "#666",
                    marginBottom: 6,
                  }}
                >
                  Stock
                </div>

                <input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) =>
                    updateForm("stock", e.target.value)
                  }
                  placeholder="20"
                  style={inputStyle}
                />
              </label>

              {/* SAVE */}

              <button
                type="submit"
                disabled={saving}
                style={{
                  height: 42,
                  padding: "0 20px",
                  border: "none",
                  borderRadius: 10,
                  background: "#111",
                  color: "#fff",
                  cursor: saving
                    ? "not-allowed"
                    : "pointer",
                  opacity: saving ? 0.6 : 1,
                  fontWeight: 600,
                }}
              >
                {saving ? "Saving..." : "Add"}
              </button>
            </div>
          </form>
        </section>

        {/* PRODUCTS */}

        <section
          style={{
            background: "#fff",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow:
              "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              padding: "20px 24px",
              borderBottom: "1px solid #eee",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                }}
              >
                Product List
              </h2>

              <div
                style={{
                  color: "#888",
                  fontSize: 13,
                  marginTop: 4,
                }}
              >
                {products.length} products
              </div>
            </div>

            <button
              onClick={loadProducts}
              disabled={loading}
              style={{
                border: "1px solid #ddd",
                background: "#fff",
                borderRadius: 9,
                padding: "8px 14px",
                cursor: loading
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {/* LOADING */}

          {loading && (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: "#777",
              }}
            >
              Loading products...
            </div>
          )}

          {/* EMPTY */}

          {!loading && products.length === 0 && (
            <div
              style={{
                padding: 50,
                textAlign: "center",
                color: "#888",
              }}
            >
              No products found.
            </div>
          )}

          {/* TABLE */}

          {!loading && products.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "#fafafa",
                    }}
                  >
                    <th style={thStyle}>
                      ID
                    </th>

                    <th style={thStyle}>
                      Product
                    </th>

                    <th
                      style={{
                        ...thStyle,
                        textAlign: "right",
                      }}
                    >
                      Price
                    </th>

                    <th
                      style={{
                        ...thStyle,
                        textAlign: "right",
                      }}
                    >
                      Stock
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td style={tdStyle}>
                        {product.id}
                      </td>

                      <td
                        style={{
                          ...tdStyle,
                          fontWeight: 500,
                        }}
                      >
                        {product.name}
                      </td>

                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "right",
                        }}
                      >
                        ₹
                        {product.price.toLocaleString(
                          "en-IN"
                        )}
                      </td>

                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "right",
                        }}
                      >
                        {product.stock}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

// ----------------------------------------
// STYLES
// ----------------------------------------

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 42,
  boxSizing: "border-box",
  border: "1px solid #ddd",
  borderRadius: 9,
  padding: "0 12px",
  fontSize: 14,
  outline: "none",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 24px",
  fontSize: 12,
  fontWeight: 600,
  color: "#777",
  borderBottom: "1px solid #eee",
};

const tdStyle: React.CSSProperties = {
  padding: "15px 24px",
  fontSize: 14,
  borderBottom: "1px solid #f0f0f0",
};
