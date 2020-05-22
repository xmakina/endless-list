;; Create a map which will use a page number and contain ten items per page
(define-map items-map 
    ((page int))
    (
        (items (list 10 int))   ;; the list of items
        (next int)              ;; the index of the next list for list traversal in case it isn't just +1
    )
)

;; Track the current page so we can easily add new items
(define-data-var current-list-page int -1)  ;; set to -1 at start so first move-to-next sets it to 0

;; The prinicpal that is allowed to add items to the list
(define-data-var allowed-user principal 'SP3GWX3NE58KXHESRYE4DYQ1S31PQJTCRXB3PE9SB)

;; Report the current page so consumers can plan for how long a list to expect
(define-read-only (get-current-page)
    (ok (var-get current-list-page))
)

;; Report the current list so consumers can confirm recent additions
(define-read-only (get-current-list)
    (ok (unwrap-panic (get items (get-items-map (var-get current-list-page)))))
)

;; Allow users to browse the pages at random
(define-read-only (get-items-map-at-page (page int))
    (ok (unwrap-panic (get-items-map page)))
)

;; Add a new item to the list by calling this function
;; Only the principal in allowed-user can change the list
(define-public (add-item (item int))
    (if
        (is-allowed)
        (if
            (current-list-has-room)
            (ok (add-to-current-list item))
            (ok (move-to-next-list-and-add item))
        )
        (err "not allowed user")
    )
)

;; Allow the current allowed-user to hand control over to a different principal
(define-public (update-allowed-user (new-user principal))
    (if
        (is-allowed)
        (ok (var-set allowed-user new-user))
        (err "not allowed user")
    )
)

;; Confirm the current sender is the allowed user
(define-private (is-allowed)
    (is-eq tx-sender (var-get allowed-user))
)

;; Add the item to the current list
(define-private (add-to-current-list (item int))
    (map-set items-map
        ((page (var-get current-list-page)))
        (
            (items (current-list-plus item))
            (next (+ (var-get current-list-page) 1))
        )
    )
)

;; get the items map without the OK wrapper
(define-private (get-items-map (page int))
    (map-get? items-map ((page page)))
)

;; return the current list with the item appended to maintain the max-length value
(define-private (current-list-plus (item int))
    (unwrap-panic (as-max-len? (add-to-current-items item) u10))
)

;; add the item to the current items list
;; concat will increase the max-length of the list
(define-private (add-to-current-items (item int))
    (concat (get items (unwrap-panic (get-items-map (var-get current-list-page)))) (list item))
)

;; check the current list exists and has less than 10 items in it
(define-private (current-list-has-room)
    (and
        (map-exists-at (var-get current-list-page))
        (less-than-ten-items-in-list-at (var-get current-list-page))
    )
)

;; confirm the map exists, this may not be the case for the first item or if a random page is looked up
(define-private (map-exists-at (page int))
    (is-some (get items (get-items-map page)))
)

;; private functions let us wrap complex checks in simple to read functions
(define-private (less-than-ten-items-in-list-at (page int))
    (> u10 (len (unwrap-panic (get items (get-items-map page)))))
)

;; advance the current list page and add a new map there, starting with given item
(define-private (move-to-next-list-and-add (item int))
    (begin
        (var-set current-list-page (+ (var-get current-list-page) 1))
        (map-set items-map 
            (
                (page (var-get current-list-page))
            )
            (
                (items (unwrap-panic (as-max-len? (list item) u10)))
                (next (+ (var-get current-list-page) 1))
            )
        )
    )
)
