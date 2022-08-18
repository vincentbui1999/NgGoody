import { throwDialogContentAlreadyAttachedError } from '@angular/cdk/dialog';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, interval, of, take, delay, Observable, observable } from 'rxjs';
import { Image, Item } from 'src/app/shared/model/Item.model';
import { User } from 'src/app/shared/model/User.model';
import { ImageService } from 'src/app/shared/service/image.service';
import { ItemService } from 'src/app/shared/service/item.service';
import { OfferService } from 'src/app/shared/service/offer.service';
import { UserService } from 'src/app/shared/service/user.service';

@Component({
  selector: 'app-item-detail',
  templateUrl: './item-detail.component.html',
  styleUrls: ['./item-detail.component.scss']
})
export class ItemDetailComponent implements OnInit 
{
  editable: boolean = false;

  item?: Item;
  images: Image[] = [];
  mainImage?: Image;
  newFiles: File[] = [];
  removeImages: Image[] = [];

  tempItem: Item = {
    name:           'item name',
    item_condition: 'used',
    description:    'Item description',
    stock:          0,
    price:          0,
    discount_price: 0,
    shipping_price: 0,
    categories:     [],
    user:           structuredClone(this.userService.getCurrentLoginUser()),
    status:         'UNSOLD',
  };
  
  displays: {value: boolean}[] = [
    {value: false},
    {value: false},
    {value: false},
    {value: false},
    {value: false},
    {value: false},
    {value: false},
    {value: false},
  ];

  tempCategory: string = '';

  constructor(
    private ar: ActivatedRoute, 
    private userService: UserService, 
    public itemService: ItemService, 
    private imageService: ImageService,
    private router: Router,
    private offerService: OfferService) { }

  ngOnInit(): void 
  {
    let itemID = +this.ar.snapshot.params['id'];

    if(itemID > 0)
    {
      this.resetItem();

      this.itemService.isOwner(itemID)
      .subscribe(
        res => this.editable = true,
        error => {}
      );
    }
    else 
    {
      this.editable = true;
    }
  }

  resetItem()
  {
    let itemID = +this.ar.snapshot.params['id'];

    this.itemService.getItem(itemID)
    .subscribe(
      res => {
        this.item = res;
        this.tempItem = structuredClone(this.item);
        this.images = this.tempItem.images!;
        this.mainImage = this.images[0];
        this.newFiles = [];
        this.removeImages = [];
      },
      error => {}
    );

    // this.imageService.getImages(itemID)
    // .subscribe(
    //   res => {this.images = res, this.mainImage = this.images[0]},
    //   error => {}
    // );
  }

  addCategory(): void
  {
    if(!(this.tempItem.categories.some((c) => c.name === this.tempCategory)))
    {
      this.tempItem.categories.push({
        name: this.tempCategory
      });
    }

    this.tempCategory = '';
  }

  removeCategory(name: string): void
  {
    this.tempItem.categories = this.tempItem.categories.filter((c) => c.name !== name);
  }

  getLineHeight(value: string): string
  {
    let lines: string[] = value.split('\n');

    return (lines.length * 21) + 'px';
  }

  processFile(imageInput: any) 
  {
    let files: File[] = imageInput.files;

    for (const [key, file] of Object.entries(files)) 
    {
      if(!this.isNewFileContain(file.name))
      {
        this.newFiles.push(file);

        const reader = new FileReader();

        reader.readAsDataURL(file);
  
        reader.onload = (_event) => { 
          let url: string | ArrayBuffer | null = reader.result;
  
          if(typeof url === 'string')
          {
            this.images.push({url: url, file_name: file.name});
  
            if(!this.mainImage)
              this.mainImage = this.images[0];
          }
        }
      }

    }    
  }

  private isNewFileContain(fileName: string): boolean
  {
    for (const [key, oldFile] of Object.entries(this.newFiles)) 
    {
      if(oldFile.name === fileName)
        return true;
    }

    return false;
  }

  createItem(): void
  {
    this.itemService.createItem(this.tempItem)
    .subscribe(
      item => {
        this.uploadNewImage(item.id!)
        .then(res => this.router.navigate(['./' + item.id]));
      },
      error => console.log(error)
    );
  }

  detectChange(): boolean
  {
    return JSON.stringify(this.item) !== JSON.stringify(this.tempItem);
  }

  addImageToRemoveImages(fileName: string): void
  {
    let indexInImages = this.images.findIndex(i => i.file_name === fileName);

    if(this.isNewFileContain(fileName))
    {
      let indexInFile = this.newFiles.findIndex(file => file.name === fileName);
      this.newFiles.splice(indexInFile, 1);
    }
    else
      this.removeImages.push(this.images[indexInImages]);

    this.images.splice(indexInImages, 1);

    if(this.images.length <= 0)
    {
      this.mainImage = undefined;
      return;
    }
    
    if(this.mainImage?.file_name === fileName)
      this.mainImage = this.images[0];
  }

  private uploadNewImage(itemID: number): Promise<void>
  {
    let sources: Observable<Image[]>[] = [];

    for (const [key, file] of Object.entries(this.newFiles)) 
      sources.push(this.imageService.uploadImage(file, itemID));

    return new Promise(resolve => {
      if(sources.length > 0)
        forkJoin(sources).subscribe(res => {console.log(res); resolve()});
      else
        resolve();
    })
  }

  private removeEditImages(): Promise<void>
  {
    let sources: Observable<any>[] = [];

    this.removeImages.forEach(image => {
      sources.push(this.imageService.deleteImage(image.id!))
    });

    return new Promise(resolve => {
      if(sources.length > 0)
        forkJoin(sources).subscribe(res => resolve());
      else
        resolve();
    })
  }

  private dummy1(): Promise<void>
  {
    let sources: Observable<any>[] = [];

    return new Promise(resolve => {
      for(let i = 0; i < 10; i++)
      {
        let observable = new Observable((ob) => {
          ob.next("Dummy " + i);
          ob.complete();
        })
        // sources.push(observable);
      }

      if(sources.length > 0)
        forkJoin(sources).subscribe(res => {console.log(res), resolve()})
      else
        resolve();
    });
  }

  private dummy2(): Promise<void>
  {
    return new Promise(resolve => {
      new Observable((ob) => {
        ob.next("Dummy Two");
        ob.complete();
      })
      .pipe(delay(1000))
      .subscribe(
        res => {console.log(res); resolve();}
      );
    });
  }

  modifyItem(): void
  {
    if(this.item)
    {
      let ItemID = this.item.id;
      this.removeEditImages()
      .then(() => {
        this.uploadNewImage(ItemID!)
        .then(() => {
          this.itemService.modifyItem(ItemID!, this.tempItem)
          .subscribe(
            res => {this.resetItem()}
          );
        })
      });
    }
  }

  makeOffer()
  {
    this.offerService.offerItem = structuredClone(this.item);
    this.router.navigate(['/offer']);
  }
}
