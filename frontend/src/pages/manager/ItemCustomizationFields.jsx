import { defaultCustomization, SIZE_OPTIONS, SUGAR_LEVELS, ICE_LEVELS } from '../../utils/orderOptions'

/** Empty option lists mean not applicable, not 0%. Only explicitly configured items use new prices. */
export default function ItemCustomizationFields({ value, onChange, disabled,
  showDrinkOptions = true, toppings = [], allowedToppingIds = [], onToppingsChange = () => {} }) {
  const legacy = !value || value.legacy
  const toggleTopping = (id) => onToppingsChange(allowedToppingIds.includes(id)
    ? allowedToppingIds.filter((selected) => selected !== id) : [...allowedToppingIds, id])
  const group = (title, key, defaultKey, choices) => {
    const selected = value[key]
    const setChoices = (next) => onChange({ ...value, [key]: next,
      [defaultKey]: next.includes(value[defaultKey]) ? value[defaultKey] : next[0] ?? null })
    return <section className="mb-3" key={key}>
      <label className="d-flex align-items-center gap-2">
        <input type="checkbox" className="form-check-input m-0" checked={selected.length > 0}
          disabled={disabled} onChange={(e) => setChoices(e.target.checked ? [...choices] : [])} />
        Áp dụng {title.toLocaleLowerCase('vi')}
      </label>
      {selected.length === 0 ? <small className="cf-muted">Món không áp dụng {title.toLocaleLowerCase('vi')}.</small> : <>
        <div className="d-flex flex-wrap gap-3 my-2">
          {choices.map((choice) => <label key={choice} className="d-flex align-items-center gap-1">
            <input type="checkbox" className="form-check-input m-0" disabled={disabled}
              checked={selected.includes(choice)} onChange={() => setChoices(
                choices.filter((c) => c === choice ? !selected.includes(c) : selected.includes(c)))} />
            {choice}{key === 'sizes' && ` (+${SIZE_OPTIONS.find((s) => s.id === choice).price.toLocaleString('vi-VN')}đ)`}
          </label>)}
        </div>
        <label>Mặc định {title.toLocaleLowerCase('vi')}
          <select className="form-select" value={value[defaultKey] || ''} disabled={disabled || selected.length === 1}
            onChange={(e) => onChange({ ...value, [defaultKey]: e.target.value })}>
            {selected.map((choice) => <option key={choice} value={choice}>{choice}</option>)}
          </select>
        </label>
        {selected.length === 1 && <small className="cf-muted">Khách thấy mức cố định này và không được thay đổi.</small>}
      </>}
    </section>
  }
  return <fieldset className="border rounded p-3">
    <legend className="fs-6 float-none w-auto px-1">Lựa chọn khi gọi món</legend>
    {showDrinkOptions && (legacy ? <>
      <p className="cf-muted">Chưa cấu hình riêng: giữ M theo giá niêm yết, L +10.000đ và các mức đường/đá cũ.</p>
      <button type="button" className="btn btn-light-soft mb-3" disabled={disabled}
        onClick={() => onChange(defaultCustomization())}>Thiết lập riêng size, đường, đá</button>
    </> : <>
      <p className="cf-muted">Giá niêm yết là giá size S: M +5.000đ, L +15.000đ. Không áp dụng size thì giữ giá niêm yết.</p>
      {group('Size', 'sizes', 'defaultSize', ['S', 'M', 'L'])}
      {group('Đường', 'sugarLevels', 'defaultSugar', SUGAR_LEVELS)}
      {group('Đá', 'iceLevels', 'defaultIce', ICE_LEVELS)}
      <p className="cf-muted">0% là lựa chọn không đường/không đá. Bỏ áp dụng nghĩa là món không có tuỳ chọn đó.</p>
    </>)}
    {!showDrinkOptions && <p className="cf-muted">Bánh không áp dụng size, đường và đá.</p>}
    <section className="mt-3">
      <label className="d-flex align-items-center gap-2">
        <input type="checkbox" className="form-check-input m-0" disabled={disabled || toppings.length === 0}
          checked={allowedToppingIds.length > 0}
          onChange={(e) => onToppingsChange(e.target.checked ? toppings.map((t) => t.id) : [])} />
        Áp dụng topping
      </label>
      <small className="cf-muted">Chọn topping khách được phép thêm vào món này. Không chọn thì món không có topping đi kèm.</small>
      <div className="d-flex flex-wrap gap-3 mt-2">
        {toppings.map((topping) => <label key={topping.id} className="d-flex align-items-center gap-1">
          <input type="checkbox" className="form-check-input m-0" disabled={disabled}
            checked={allowedToppingIds.includes(topping.id)} onChange={() => toggleTopping(topping.id)} />
          {topping.name} (+{Number(topping.basePrice).toLocaleString('vi-VN')}đ)
          {topping.availabilityStatus === 'UNAVAILABLE' && <small className="cf-muted"> · Tạm hết</small>}
        </label>)}
      </div>
      {toppings.length === 0 && <p className="cf-muted mt-2">Chưa có topping. Thêm món thuộc danh mục Topping trước.</p>}
    </section>
  </fieldset>
}
