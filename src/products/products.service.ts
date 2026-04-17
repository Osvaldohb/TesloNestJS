import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { error } from 'console';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import {validate as IsUuid} from 'uuid'

@Injectable()
export class ProductsService {

  private readonly logger=new Logger('ProductsService');  

  constructor(
    @InjectRepository(Product)
    private readonly productRepository:Repository<Product>
  ) {

  }

  async create(createProductDto: CreateProductDto) {
     
    try{

      // if(!createProductDto.slug){
      //   createProductDto.slug=createProductDto.title.toLowerCase().replaceAll(' ', '-').replaceAll("'", '');
      // }else{
      //   createProductDto.slug=createProductDto.slug.toLowerCase().replaceAll(' ', '-').replaceAll("'", '');
      // }

      const product =this.productRepository.create(createProductDto);
      await this.productRepository.save(product);
      return product;
  }catch(error:any){

    this.handleExceptions(error);
   
  }


  }

  findAll(paginationDto: PaginationDto) {

    const {limit=10,offset=0}=paginationDto;

    return this.productRepository.find({
      take:limit,
      skip:offset
      //ToDo relaciones
    })

  }

  async findOne(term: string){
    try{
        let product:Product | null ;

        if(IsUuid(term)){
          product=await this.productRepository.findOneBy({id:term})
        }else{

          const queryBuilder=this.productRepository.createQueryBuilder();
          product= await queryBuilder.where(`UPPER(title)=:title or slug=:slug`,{
            title:term.toUpperCase(),
            slug:term.toLowerCase()
          }).getOne()

        }

        //const product=await this.productRepository.findOneBy({id:term.toString()})
        if(!product) {
        const error:any=new Error(`Product with id ${term} not found`)
        error.code='404'
        throw error
      }
        return product;
    }catch(error:any){
        this.handleExceptions(error)
    }
  

  }

  async update(id: string, updateProductDto: UpdateProductDto) {

   const product=await this.productRepository.preload({
    id:id,
    ...updateProductDto
   });

   if(!product){
    const error:any=new Error(`Product with id ${id} not found`)
    error.code='404'
    throw error
   }

   
   try{
    await this.productRepository.save(product);
    return product
   }catch(error){
    this.handleExceptions(error)
   }

    


  }

   async remove(id: string) {

    await this.findOne(id)

    await this.productRepository.delete(id);
    
   

    

    return `Product with id ${id} has been removed`;
  }

  private handleExceptions(error:any){

    switch(error.code){
      case '23505':
        throw new BadRequestException(error.detail); break
      case '404':
        throw new NotFoundException(error.message); break

      default:
        this.logger.error(error)
        throw new InternalServerErrorException('Unexpected error, check server logs')
    }

  }

}
