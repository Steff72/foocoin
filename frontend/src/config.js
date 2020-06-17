import axios from 'axios'

export const URL =`${document.location.origin}/api`
//export const URL ='http://127.0.0.1:5000/api'

export const RANGE = 3

export const backend = axios.create({
    baseURL: URL
})