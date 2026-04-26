// App.jsx — top-level state and router
const { useState, useCallback } = React;

window.App = function App() {
  const [route, setRoute] = useState({ name: "home" });
  const [cart, setCart]   = useState([]);
  const [wish, setWish]   = useState([]);
  const [toast, setToast] = useState(null);

  const go = useCallback((r) => {
    setRoute(r);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const addCart = useCallback((line) => {
    setCart(c => {
      const existing = c.find(x => x.id === line.id && x.size === line.size && x.material === line.material);
      if (existing) return c.map(x => x === existing ? { ...x, qty: x.qty + 1 } : x);
      return [...c, { ...line, qty: 1 }];
    });
    const p = CATALOG.find(x => x.id === line.id);
    setToast(p?.name + " adicionada à sacola");
    go({ name: "cart" });
  }, [go]);

  const removeCart = useCallback((line) => setCart(c => c.filter(x => x !== line)), []);
  const qtyCart    = useCallback((line, delta) =>
    setCart(c => c.map(x => x === line ? { ...x, qty: Math.max(1, x.qty + delta) } : x)), []);

  const toggleWish = useCallback((id) =>
    setWish(w => w.includes(id) ? w.filter(x => x !== id) : [...w, id]), []);

  const cartCount = cart.reduce((s, l) => s + l.qty, 0);
  const wishCount = wish.length;

  // Demo cart for empty checkout
  const demoCart = cart.length ? cart : [{ id: 1, size: 14, material: "ouro-amarelo", qty: 1 }];
  // Demo wish for wishlist+
  const demoWish = wish.length ? wish : [1, 3, 5, 8];

  const r = route;
  return (
    <>
      <Header cartCount={cartCount} wishCount={wishCount} route={route} go={go}/>
      <main>
        {r.name === "home" && <Home go={go} onWish={toggleWish} wished={wish}/>}
        {r.name === "plp"  && <PLP category={r.category} go={go} onWish={toggleWish} wished={wish}/>}
        {r.name === "pdp"  && <PDP id={r.id} go={go} onAddCart={addCart} onWish={toggleWish} wished={wish} urgency={r.urgency}/>}
        {r.name === "cart" && <Cart items={cart} onRemove={removeCart} onQty={qtyCart} go={go} onWish={toggleWish} wished={wish}/>}
        {r.name === "wishlist" && <WishlistPro wish={demoWish} onWish={toggleWish} wished={wish} go={go}/>}
        {r.name === "checkout" && <Checkout items={demoCart} go={go}/>}
        {r.name === "account-home"      && <AccountHome go={go}/>}
        {r.name === "account-orders"    && <AccountOrders go={go}/>}
        {r.name === "account-warranty"  && <AccountWarranty go={go}/>}
        {r.name === "account-addresses" && <AccountAddresses go={go}/>}
        {r.name === "account-profile"   && <AccountProfile go={go}/>}
        {r.name === "tracking" && <Tracking num={r.num} go={go}/>}
        {r.name === "login"    && <AuthScreen mode="login" go={go}/>}
        {r.name === "signup"   && <AuthScreen mode="signup" go={go}/>}
        {r.name === "recover"  && <AuthScreen mode="recover" go={go}/>}
        {r.name === "about"    && <PageAbout go={go}/>}
        {r.name === "returns"  && <PageReturns/>}
        {r.name === "privacy"  && <PagePrivacy/>}
        {r.name === "terms"    && <PageTerms/>}
        {r.name === "404"      && <NotFound code={404} go={go}/>}
        {r.name === "500"      && <NotFound code={500} go={go}/>}
        {r.name === "emails"   && <EmailGallery/>}
        {r.name === "states"   && <StatesGallery go={go}/>}
      </main>
      {!["checkout","login","signup","recover"].includes(r.name) && <Footer go={go}/>}
      {toast && <Toast message={toast} onClose={()=>setToast(null)}/>}
    </>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
